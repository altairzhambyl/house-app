-- Local development seed: two buildings, so building isolation is testable.
-- Users are created through Supabase Auth (see apps/api/tests), not here.

insert into public.buildings (id, name, address) values
  ('00000000-0000-0000-0000-00000000b001', 'Demo Block A', 'Demo Street 1'),
  ('00000000-0000-0000-0000-00000000b002', 'Demo Block B', 'Demo Street 2');

insert into public.flats (id, building_id, number) values
  ('00000000-0000-0000-0000-0000000f0141', '00000000-0000-0000-0000-00000000b001', '14B'),
  ('00000000-0000-0000-0000-0000000f0071', '00000000-0000-0000-0000-00000000b001', '7A'),
  ('00000000-0000-0000-0000-0000000f0221', '00000000-0000-0000-0000-00000000b002', '22C');
