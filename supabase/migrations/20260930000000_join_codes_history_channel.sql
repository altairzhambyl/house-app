-- MVP: flat join codes (sign-in by flat), request status history and the
-- building channel.
--
-- Same tenancy rule as the core schema: the API (service role) filters by the
-- caller's building in code; the RLS policies here are the second line.

-- ---------------------------------------------------------------------------
-- Flat join codes
-- ---------------------------------------------------------------------------

-- 10 characters from an alphabet without look-alikes (no 0/O, 1/I/L), so a
-- code read aloud or copied from paper cannot be mistyped into another one.
-- apps/api/app/routers/flats.py generates rotated codes from the same alphabet;
-- the check constraint below keeps the two in line.
create function public.generate_join_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(10);
  code text := '';
begin
  for i in 0..9 loop
    code := code || substr(alphabet, 1 + get_byte(bytes, i) % length(alphabet), 1);
  end loop;
  return code;
end;
$$;

-- The volatile default gives every existing flat its own code.
alter table public.flats
  add column join_code text not null default public.generate_join_code()
    unique check (join_code ~ '^[A-HJKMNP-Z2-9]{10}$');

-- A join code is a credential: any resident could otherwise read the codes of
-- their neighbours' flats through the "flats of own building" policy and join
-- them. Clients get the plain columns only; managers read codes via the API.
revoke select on public.flats from authenticated, anon;
grant select (id, building_id, number) on public.flats to authenticated;

-- ---------------------------------------------------------------------------
-- Request status history
-- ---------------------------------------------------------------------------

create table public.request_events (
  -- Identity, not a timestamp, orders the history: two events can share a
  -- created_at, their insertion order cannot be the same.
  id         bigint generated always as identity primary key,
  request_id uuid not null references public.requests (id) on delete cascade,
  status     public.request_status not null,
  -- Null once the actor's account is gone; the history entry itself stays.
  actor_id   uuid references public.residents (id) on delete set null,
  created_at timestamptz not null default now()
);

create index request_events_request_idx on public.request_events (request_id, id);

-- Every creation and every real status change is logged here, whoever made it:
-- the API through set_request_status(), or a manager's token straight against
-- the REST API (allowed by the core schema's column grant). The actor is the
-- caller's user id, or for the service role the id set_request_status() passes.
-- SECURITY DEFINER: clients have no insert right on request_events.
create function public.log_request_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid;
begin
  if tg_op = 'INSERT' then
    actor := new.author_id;
  else
    actor := coalesce(auth.uid(), nullif(current_setting('app.actor_id', true), '')::uuid);
  end if;
  insert into public.request_events (request_id, status, actor_id)
  values (new.id, new.status, actor);
  return null;
end;
$$;

create trigger requests_log_created
  after insert on public.requests
  for each row execute function public.log_request_event();

create trigger requests_log_status_change
  after update of status on public.requests
  for each row when (old.status is distinct from new.status)
  execute function public.log_request_event();

-- The API's status change: row lock, no-op when unchanged, and the history
-- entry in the same transaction. Returns false when the request is not in
-- p_building_id, so the caller can answer 404.
create function public.set_request_status(
  p_request_id uuid,
  p_building_id uuid,
  p_status public.request_status,
  p_actor_id uuid
) returns boolean
language plpgsql set search_path = '' as $$
declare
  current_status public.request_status;
begin
  select status into current_status
  from public.requests
  where id = p_request_id and building_id = p_building_id
  for update;

  if not found then
    return false;
  end if;

  if current_status is distinct from p_status then
    -- Transaction-local: read by log_request_event() for this update only.
    perform set_config('app.actor_id', p_actor_id::text, true);
    update public.requests set status = p_status where id = p_request_id;
  end if;
  return true;
end;
$$;

-- Only the backend may call it: it trusts its building and actor arguments.
revoke execute on function public.set_request_status(uuid, uuid, public.request_status, uuid)
  from public, anon, authenticated;
grant execute on function public.set_request_status(uuid, uuid, public.request_status, uuid)
  to service_role;

alter table public.request_events enable row level security;

create policy "history of own building's requests" on public.request_events
  for select to authenticated using (
    exists (
      select 1 from public.requests r
      where r.id = request_id and r.building_id = public.current_building_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Building channel
-- ---------------------------------------------------------------------------

create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete cascade,
  author_id   uuid not null references public.residents (id) on delete cascade,
  body        text not null check (length(trim(body)) between 1 and 2000),
  created_at  timestamptz not null default now()
);

create index messages_building_created_idx on public.messages (building_id, created_at desc);

alter table public.messages enable row level security;

create policy "messages of own building" on public.messages
  for select to authenticated using (building_id = public.current_building_id());

create policy "post to own building" on public.messages
  for insert to authenticated with check (
    author_id = auth.uid() and building_id = public.current_building_id()
  );
