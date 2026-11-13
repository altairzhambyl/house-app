-- ITP-40 + ITP-55: building polls with one vote per resident.
--
-- Lifecycle (status is text with a check, not an enum, so later states need no
-- ALTER TYPE):
--   proposed  a resident's proposal; visible to its author and the building's managers
--   open      approved by a manager, or created by one; residents vote until ends_at
--   rejected  a manager turned the proposal down, with a reason
--   closed    closed early by a manager. An open poll past ends_at is also treated
--             as closed: no votes are accepted after ends_at.
--
-- Options are fixed: for / against / abstain. Results are advisory (ITP-28): the
-- app does not run a legally binding owners' meeting vote.
--
-- Same tenancy rule as the core schema: the API (service role) filters by the
-- caller's building in code; the RLS policies here are the second line.

create table public.polls (
  id            uuid primary key default gen_random_uuid(),
  building_id   uuid not null references public.buildings (id) on delete cascade,
  author_id     uuid not null references public.residents (id) on delete cascade,
  question      text not null check (length(trim(question)) between 1 and 300),
  description   text check (description is null or length(trim(description)) between 1 and 2000),
  ends_at       timestamptz not null,
  status        text not null default 'proposed'
                check (status in ('proposed', 'open', 'rejected', 'closed')),
  reject_reason text check (reject_reason is null or length(trim(reject_reason)) between 1 and 500),
  -- The manager who approved, rejected or closed it; null once their account is gone.
  reviewed_by   uuid references public.residents (id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  check (ends_at > created_at),
  -- A reason exactly when rejected.
  check ((status = 'rejected') = (reject_reason is not null)),
  -- Target for the composite foreign key below: a vote's building is its poll's.
  unique (id, building_id)
);

create index polls_building_created_idx on public.polls (building_id, created_at desc);
create index polls_author_idx on public.polls (author_id);

create table public.poll_votes (
  poll_id     uuid not null,
  building_id uuid not null,
  resident_id uuid not null references public.residents (id) on delete cascade,
  choice      text not null check (choice in ('for', 'against', 'abstain')),
  created_at  timestamptz not null default now(),
  -- One vote per resident per poll; a second insert is a unique violation.
  primary key (poll_id, resident_id),
  foreign key (poll_id, building_id) references public.polls (id, building_id) on delete cascade
);

-- The voter's residents row is referenced by id only, not (id, building_id):
-- a removed resident may rejoin in another building, and their old votes stay
-- with the old building's poll. The API and the insert policy check that the
-- voter belongs to the poll's building at the time of voting.
create index poll_votes_resident_idx on public.poll_votes (resident_id);

-- Tallies for a page of polls, in one round trip. Only the backend calls it.
create function public.poll_tallies(p_building_id uuid, p_poll_ids uuid[])
returns table (poll_id uuid, votes_for bigint, votes_against bigint, votes_abstain bigint)
language sql stable set search_path = '' as $$
  select
    v.poll_id,
    count(*) filter (where v.choice = 'for'),
    count(*) filter (where v.choice = 'against'),
    count(*) filter (where v.choice = 'abstain')
  from public.poll_votes v
  where v.building_id = p_building_id and v.poll_id = any (p_poll_ids)
  group by v.poll_id
$$;

revoke execute on function public.poll_tallies(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.poll_tallies(uuid, uuid[]) to service_role;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.polls      enable row level security;
alter table public.poll_votes enable row level security;

-- Open and closed polls of the building; proposals only to their author and managers.
create policy "polls of own building" on public.polls
  for select to authenticated using (
    building_id = public.current_building_id()
    and (status in ('open', 'closed') or author_id = auth.uid() or public.is_manager())
  );

-- Managers may open a poll directly. Residents have no insert policy: proposals
-- come only through the API, which applies the per-user "poll_create" rate limit
-- (a direct insert would skip it and could flood the moderation queue). There is
-- no update policy: approve / reject / close go through the API.
create policy "managers open polls in own building" on public.polls
  for insert to authenticated with check (
    public.is_manager()
    and author_id = auth.uid()
    and building_id = public.current_building_id()
    and status = 'open'
    and reject_reason is null
    and reviewed_by is null
    and reviewed_at is null
    and ends_at > now()
  );

revoke insert, update, delete on public.polls from authenticated, anon;
grant insert (building_id, author_id, question, description, ends_at, status)
  on public.polls to authenticated;

-- A ballot is private: a user reads only their own votes. Tallies come from the API.
create policy "own votes" on public.poll_votes
  for select to authenticated using (resident_id = auth.uid());

create policy "residents vote on open polls of own building" on public.poll_votes
  for insert to authenticated with check (
    resident_id = auth.uid()
    and not public.is_manager()
    and poll_votes.building_id = public.current_building_id()
    and exists (
      select 1 from public.polls p
      where p.id = poll_votes.poll_id
        and p.building_id = poll_votes.building_id
        and p.status = 'open'
        and p.ends_at > now()
    )
  );

revoke insert, update, delete on public.poll_votes from authenticated, anon;
grant insert (poll_id, building_id, resident_id, choice) on public.poll_votes to authenticated;

-- ---------------------------------------------------------------------------
-- Votes only on a poll that is open right now, checked atomically.
-- ---------------------------------------------------------------------------
-- The API inserts with the service role, which bypasses the RLS check above, and
-- reads the poll in a separate statement first. This trigger locks the poll row
-- (FOR SHARE blocks a concurrent close until the vote commits, and vice versa),
-- so a vote can never land after a close or after ends_at.
-- SECURITY DEFINER because FOR SHARE needs UPDATE privilege on polls, which
-- authenticated users do not have; the function only reads one row.
create function public.guard_poll_vote() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.polls p
  where p.id = new.poll_id
    and p.building_id = new.building_id
    and p.status = 'open'
    and p.ends_at > now()
  for share;
  if not found then
    raise exception 'poll % is not open for voting', new.poll_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger poll_votes_guard_open
  before insert on public.poll_votes
  for each row execute function public.guard_poll_vote();

revoke all on function public.guard_poll_vote() from public, anon, authenticated;
