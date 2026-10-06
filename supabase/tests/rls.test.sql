-- pgTAP RLS checks. Run with: supabase test db
begin;
select plan(4);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.dev'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.dev');

insert into public.habits (id, user_id, name, icon, color, type)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Read', '📚', 'indigo', 'boolean');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';

select is((select count(*) from public.habits)::int, 0, 'user B cannot see user A''s habits');
select throws_ok(
  $$insert into public.habits (user_id, name, icon, color, type) values ('00000000-0000-0000-0000-00000000000a', 'x', 'x', 'x', 'boolean')$$,
  '42501', null, 'user B cannot insert rows for user A');
select is((select count(*) from public.entitlements_cache)::int, 0, 'no entitlements visible');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select is((select count(*) from public.habits)::int, 1, 'user A sees their own habit');

select * from finish();
rollback;
