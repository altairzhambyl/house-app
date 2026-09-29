-- Local development seed: two buildings, so building isolation is testable,
-- plus two demo accounts for trying the app. LOCAL ONLY - the passwords and
-- join codes below are public.
--
-- Fixed flat join codes (alphabet without 0/O/1/I/L, see the migration):
--   Demo Block A, flat 14B  HVWXA2345B
--   Demo Block A, flat 7A   KRPT7AWXYZ
--   Demo Block B, flat 22C  ZC22GHJKMN
--
-- Demo accounts (email / password):
--   manager@demo.test  / demo-password  manager of Demo Block A, no flat
--   resident@demo.test / demo-password  resident of flat 14B, Demo Block A
--
-- Test users are created through Supabase Auth by apps/api/tests, not here.

insert into public.buildings (id, name, address) values
  ('00000000-0000-0000-0000-00000000b001', 'Demo Block A', 'Demo Street 1'),
  ('00000000-0000-0000-0000-00000000b002', 'Demo Block B', 'Demo Street 2');

insert into public.flats (id, building_id, number, join_code) values
  ('00000000-0000-0000-0000-0000000f0141', '00000000-0000-0000-0000-00000000b001', '14B', 'HVWXA2345B'),
  ('00000000-0000-0000-0000-0000000f0071', '00000000-0000-0000-0000-00000000b001', '7A', 'KRPT7AWXYZ'),
  ('00000000-0000-0000-0000-0000000f0221', '00000000-0000-0000-0000-00000000b002', '22C', 'ZC22GHJKMN');

-- GoTrue password sign-in reads these rows directly. The token columns must be
-- '' rather than NULL: GoTrue fails to scan NULL into them.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('demo-password', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
  '', '', '', '', '', '', '', ''
from (values
  ('00000000-0000-0000-0000-0000000d0001'::uuid, 'manager@demo.test'),
  ('00000000-0000-0000-0000-0000000d0002'::uuid, 'resident@demo.test')
) as u (id, email);

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
select
  id, id, id::text, 'email',
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  now(), now(), now()
from auth.users
where id in ('00000000-0000-0000-0000-0000000d0001', '00000000-0000-0000-0000-0000000d0002');

insert into public.residents (id, building_id, flat_id, full_name, role) values
  ('00000000-0000-0000-0000-0000000d0001', '00000000-0000-0000-0000-00000000b001',
   null, 'Demo Manager', 'manager'),
  ('00000000-0000-0000-0000-0000000d0002', '00000000-0000-0000-0000-00000000b001',
   '00000000-0000-0000-0000-0000000f0141', 'Demo Resident', 'resident');
