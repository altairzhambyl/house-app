-- ITP-23: managers remove a resident from a flat.
--
-- Removal is a soft flag, not a DELETE. requests.author_id, announcements.author_id
-- and messages.author_id cascade on delete (and request_events cascade through
-- requests), so deleting the residents row - or the auth user - would wipe the
-- building's requests, their status history and channel messages. A removed
-- resident keeps their row (name, flat, building), so that history still shows
-- who wrote what; `removed_at` only cuts off access.
--
-- Access is cut in two places:
--   * the API: load_resident() ignores removed rows, so the caller is "not linked";
--   * direct Supabase access with a user token: current_building_id() and
--     is_manager() below ignore removed rows, so every building-scoped policy
--     (flats, requests, announcements, messages, request_events, storage photos)
--     matches nothing for a removed user.
-- Rejoining with a valid, current join code clears the flag (POST /api/join).

alter table public.residents add column removed_at timestamptz;

-- Managers are never removed through this flag.
alter table public.residents
  add constraint residents_only_residents_removed
  check (removed_at is null or role = 'resident');

create index residents_active_flat_idx on public.residents (flat_id) where removed_at is null;

-- CREATE OR REPLACE keeps the grants and every policy that calls these.
create or replace function public.current_building_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select building_id from public.residents where id = auth.uid() and removed_at is null
$$;

create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select role = 'manager' from public.residents where id = auth.uid() and removed_at is null),
    false
  )
$$;
