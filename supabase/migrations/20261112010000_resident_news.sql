-- ITP-51: residents can submit building news; a manager approves or rejects it.
--
-- Flow: a resident's post starts as 'pending' and is visible only to its author
-- and the building's managers. A manager approves it ('published', visible to
-- the whole building) or rejects it ('rejected', with an optional reason the
-- author sees). A manager's own post is 'published' straight away, as before.
--
-- The API (service role) enforces these rules; the policies below mirror them
-- for direct access with a user token. There is no UPDATE policy: moderation
-- goes through the API only.

alter table public.announcements
  add column status text not null default 'published'
    check (status in ('pending', 'published', 'rejected')),
  add column reject_reason text
    check (reject_reason is null or length(trim(reject_reason)) between 1 and 500),
  -- Who approved or rejected it. Kept if that manager's account goes away.
  add column reviewed_by uuid references public.residents (id) on delete set null,
  add column reviewed_at timestamptz;

-- A reason only makes sense on a rejected post.
alter table public.announcements
  add constraint announcements_reason_only_when_rejected
  check (reject_reason is null or status = 'rejected');

-- The moderation queue: pending posts of one building.
create index announcements_building_status_idx
  on public.announcements (building_id, status, created_at desc);

drop policy "announcements of own building" on public.announcements;
drop policy "managers post announcements" on public.announcements;

-- Published news of the caller's building, plus the caller's own posts in any
-- state; managers see every post of their building (the moderation queue).
create policy "news of own building" on public.announcements
  for select to authenticated using (
    building_id = public.current_building_id()
    and (status = 'published' or author_id = auth.uid() or public.is_manager())
  );

create policy "managers publish news" on public.announcements
  for insert to authenticated with check (
    public.is_manager()
    and author_id = auth.uid()
    and building_id = public.current_building_id()
    and status = 'published'
    and reject_reason is null
    and reviewed_by is null
    and reviewed_at is null
  );

create policy "residents submit news for review" on public.announcements
  for insert to authenticated with check (
    not public.is_manager()
    and author_id = auth.uid()
    and building_id = public.current_building_id()
    and status = 'pending'
    and reject_reason is null
    and reviewed_by is null
    and reviewed_at is null
  );
