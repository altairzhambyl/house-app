-- Week 4, task 4.1-4.3: core schema for house-app.
--
-- One building (ЖК block) is the tenancy boundary: a resident reads and writes
-- only rows of their own building. The FastAPI backend uses the service role
-- key, which bypasses RLS, so the API enforces the same rule in code. The RLS
-- policies below are the second line of defence for any client that talks to
-- Supabase directly with a user token.

create type public.user_role as enum ('resident', 'manager');
create type public.request_status as enum ('pending', 'in_progress', 'done');
create type public.request_category as enum (
  'plumbing', 'electrical', 'locksmith', 'sanitation', 'cleaning', 'other'
);

create table public.buildings (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  address    text not null check (length(trim(address)) > 0),
  created_at timestamptz not null default now()
);

create table public.flats (
  id          uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete cascade,
  number      text not null check (length(trim(number)) > 0),
  unique (building_id, number),
  -- Target for composite foreign keys: guarantees a flat referenced together
  -- with a building really belongs to that building.
  unique (id, building_id)
);

-- A resident is a signed-in Supabase Auth user attached to one building.
-- Managers (УК staff) have no flat.
create table public.residents (
  id          uuid primary key references auth.users (id) on delete cascade,
  building_id uuid not null references public.buildings (id) on delete restrict,
  flat_id     uuid,
  full_name   text not null check (length(trim(full_name)) > 0),
  role        public.user_role not null default 'resident',
  created_at  timestamptz not null default now(),
  foreign key (flat_id, building_id) references public.flats (id, building_id),
  check (role = 'manager' or flat_id is not null)
);

create table public.requests (
  id          uuid primary key default gen_random_uuid(),
  -- Human-readable number shown in the UI as REQ-<number>.
  number      bigint generated always as identity unique,
  building_id uuid not null references public.buildings (id) on delete cascade,
  flat_id     uuid not null,
  author_id   uuid not null references public.residents (id) on delete cascade,
  category    public.request_category not null,
  description text not null check (length(trim(description)) between 1 and 2000),
  location    text check (location is null or length(location) <= 200),
  status      public.request_status not null default 'pending',
  -- Object path inside the private `request-photos` bucket.
  photo_path  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (flat_id, building_id) references public.flats (id, building_id)
);

create index requests_building_created_idx on public.requests (building_id, created_at desc);
create index requests_author_idx on public.requests (author_id);

-- "News" in the week-4 plan: announcements from the УК to one building.
create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete cascade,
  author_id   uuid not null references public.residents (id) on delete cascade,
  title       text not null check (length(trim(title)) between 1 and 200),
  body        text not null check (length(trim(body)) between 1 and 5000),
  created_at  timestamptz not null default now()
);

create index announcements_building_created_idx
  on public.announcements (building_id, created_at desc);

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger requests_touch_updated_at
  before update on public.requests
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so the policies can look up the caller's building without
-- recursing into the residents policy.
create function public.current_building_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select building_id from public.residents where id = auth.uid()
$$;

create function public.is_manager() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select role = 'manager' from public.residents where id = auth.uid()),
    false
  )
$$;

alter table public.buildings     enable row level security;
alter table public.flats         enable row level security;
alter table public.residents     enable row level security;
alter table public.requests      enable row level security;
alter table public.announcements enable row level security;

create policy "own building" on public.buildings
  for select to authenticated using (id = public.current_building_id());

create policy "flats of own building" on public.flats
  for select to authenticated using (building_id = public.current_building_id());

-- Residents see themselves; managers see everyone in their building.
create policy "self or manager of building" on public.residents
  for select to authenticated using (
    id = auth.uid()
    or (public.is_manager() and building_id = public.current_building_id())
  );

create policy "requests of own building" on public.requests
  for select to authenticated using (building_id = public.current_building_id());

create policy "residents file requests for own flat" on public.requests
  for insert to authenticated with check (
    author_id = auth.uid()
    and building_id = public.current_building_id()
    and flat_id = (select flat_id from public.residents where id = auth.uid())
    -- New requests start clean; status and photo are set by the УК / the API.
    and status = 'pending'
    and photo_path is null
  );

create policy "managers update requests of own building" on public.requests
  for update to authenticated
  using (public.is_manager() and building_id = public.current_building_id())
  with check (building_id = public.current_building_id());

-- Managers may only move a request through its workflow, not rewrite it.
revoke update on public.requests from authenticated, anon;
grant update (status) on public.requests to authenticated;

create policy "announcements of own building" on public.announcements
  for select to authenticated using (building_id = public.current_building_id());

create policy "managers post announcements" on public.announcements
  for insert to authenticated with check (
    public.is_manager()
    and author_id = auth.uid()
    and building_id = public.current_building_id()
  );

-- ---------------------------------------------------------------------------
-- Storage: request photos (task 4.3)
-- ---------------------------------------------------------------------------

-- Private bucket. Objects are written by the API and read through short-lived
-- signed URLs; paths are <building_id>/<request_id>/<file>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'request-photos', 'request-photos', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "read photos of own building" on storage.objects
  for select to authenticated using (
    bucket_id = 'request-photos'
    and (storage.foldername(name))[1] = public.current_building_id()::text
  );
