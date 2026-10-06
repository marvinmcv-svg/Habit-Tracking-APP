-- Minimal stand-in for Supabase's auth schema so the migrations run on plain Postgres.
create role anon nologin;
create role authenticated nologin;
create role authenticator login noinherit;
grant anon, authenticated to authenticator;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid
$$;
grant usage on schema public, auth to anon, authenticated;
