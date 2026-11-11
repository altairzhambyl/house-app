-- ITP-26 / ITP-32: rate limits shared by every API instance.
--
-- The API runs as serverless functions on Vercel, so an in-memory counter would
-- be per instance and useless. Counters live here instead: one row per key per
-- fixed window, bumped atomically by hit_rate_limit().
--
-- Only the API (service role) may touch this. RLS is on with no policies, and
-- EXECUTE on the function is revoked from everyone else, so a user cannot read,
-- reset or spend someone else's budget through PostgREST.

create table public.rate_limit_hits (
  key          text        not null check (length(key) between 1 and 200),
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limit_hits enable row level security;
revoke all on public.rate_limit_hits from public, anon, authenticated;

-- Counts one call against `p_key` and says whether it is within `p_limit`
-- calls per fixed window of `p_window_seconds`.
create function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit % per % s', p_limit, p_window_seconds;
  end if;

  -- Atomic under concurrency: the upsert takes the row lock.
  insert into public.rate_limit_hits as r (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- Opportunistic cleanup of finished windows (cheap: a small, indexed table).
  if random() < 0.01 then
    delete from public.rate_limit_hits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
