-- ITP-53: a resident can withdraw their own request while it is still new.
--
-- Only the enum value lives here. Postgres cannot use a value added with
-- ALTER TYPE ... ADD VALUE in the same transaction, so the rules that compare
-- against 'withdrawn' are in the next migration (20261112000100).

alter type public.request_status add value if not exists 'withdrawn';
