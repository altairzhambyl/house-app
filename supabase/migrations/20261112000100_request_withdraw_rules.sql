-- ITP-53: rules for the 'withdrawn' request status (added in 20261112000000).
--
-- * Only the request's author may withdraw it, and only while it is 'pending'.
-- * A withdrawn request is final: nobody, managers included, can move it to
--   another status. Nothing is deleted; the row and its history stay.
--
-- The rules are enforced by a trigger, so they hold for every path that can
-- change a status: the API's set_request_status() and withdraw_request(), and a
-- manager's token used straight against the REST API (allowed by the core
-- schema's column grant). Residents still have no update policy on requests, so
-- they can only withdraw through the API.

create function public.guard_request_status() returns trigger
language plpgsql set search_path = '' as $$
declare
  actor uuid;
begin
  if old.status = 'withdrawn' then
    raise exception 'request % is withdrawn; its status can no longer change', old.id
      using errcode = 'check_violation';
  end if;

  if new.status = 'withdrawn' then
    if old.status <> 'pending' then
      raise exception 'request % is %, only a pending request can be withdrawn', old.id, old.status
        using errcode = 'check_violation';
    end if;
    -- Same actor resolution as log_request_event(): the caller's token, or the
    -- id the API passes when it calls as the service role.
    actor := coalesce(auth.uid(), nullif(current_setting('app.actor_id', true), '')::uuid);
    if actor is distinct from old.author_id then
      raise exception 'only the author can withdraw request %', old.id
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger requests_guard_status
  before update of status on public.requests
  for each row when (old.status is distinct from new.status)
  execute function public.guard_request_status();

-- The API's withdraw: row lock, rule check and the history entry (through the
-- requests_log_status_change trigger) in one transaction. Returns
--   'withdrawn'   - done;
--   'not_found'   - no such request in p_building_id, or p_author_id did not
--                   write it (the API answers 404, so nothing leaks);
--   'not_pending' - the request has moved on or was already withdrawn (409).
create function public.withdraw_request(
  p_request_id uuid,
  p_building_id uuid,
  p_author_id uuid
) returns text
language plpgsql set search_path = '' as $$
declare
  current_status public.request_status;
  current_author uuid;
begin
  select status, author_id into current_status, current_author
  from public.requests
  where id = p_request_id and building_id = p_building_id
  for update;

  if not found or current_author is distinct from p_author_id then
    return 'not_found';
  end if;

  if current_status <> 'pending' then
    return 'not_pending';
  end if;

  -- Transaction-local: read by guard_request_status() and log_request_event().
  perform set_config('app.actor_id', p_author_id::text, true);
  update public.requests set status = 'withdrawn' where id = p_request_id;
  return 'withdrawn';
end;
$$;

-- Only the backend may call it: it trusts its building and author arguments.
revoke execute on function public.withdraw_request(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.withdraw_request(uuid, uuid, uuid)
  to service_role;
