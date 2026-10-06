-- Bloom — initial schema.
-- Every table carries id / user_id / created_at / updated_at / deleted_at (tombstone)
-- so the client's last-write-wins sync can merge by updated_at and propagate deletes.
-- RLS is enabled on every table: users only ever see their own rows, plus shared-habit
-- rows for habits they are a member of.

create extension if not exists "pgcrypto";

-- Keeps updated_at honest on every write.
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  user_id uuid generated always as (id) stored,
  display_name text,
  locale text not null default 'en',
  timezone text not null default 'UTC',
  onboarding_answers jsonb not null default '{}'::jsonb,
  notification_prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------- habits
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  icon text not null,
  color text not null,
  type text not null check (type in ('boolean', 'count', 'duration', 'quit')),
  target_value numeric not null default 1 check (target_value > 0),
  unit text,
  schedule jsonb not null default '{"kind":"daily"}'::jsonb,
  reminder_times text[] not null default '{}',
  time_of_day_group text not null default 'anytime' check (time_of_day_group in ('morning', 'afternoon', 'evening', 'anytime')),
  category text,
  start_date date not null default current_date,
  sort_order int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index habits_user_updated on public.habits (user_id, updated_at);

-- ---------------------------------------------------------------- habit_logs
create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  local_date date not null,
  value numeric not null default 0 check (value >= 0),
  source text not null default 'manual' check (source in ('manual', 'healthkit', 'health_connect', 'widget', 'shared')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (habit_id, user_id, local_date)
);
create index habit_logs_user_updated on public.habit_logs (user_id, updated_at);

-- ---------------------------------------------------------------- streak freezes
create table public.streak_freezes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  reason text not null default 'freeze' check (reason in ('freeze', 'repair')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, local_date)
);

-- ---------------------------------------------------------------- companion & economy
create table public.companion (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  species text not null default 'pip',
  name text not null default 'Pip',
  stage int not null default 0,
  xp int not null default 0,
  coin_balance int not null default 0,
  equipped jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_key text not null,
  acquired_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.adventures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  reward jsonb not null default '{}'::jsonb,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------- social
create table public.shared_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade, -- owner
  habit_id uuid not null references public.habits (id) on delete cascade,
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.shared_habit_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  shared_habit_id uuid not null references public.shared_habits (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (shared_habit_id, user_id)
);

create table public.friend_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade, -- requester
  addressee uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, addressee),
  check (user_id <> addressee)
);

-- ---------------------------------------------------------------- platform
create table public.entitlements_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  rc_app_user_id text not null,
  active_entitlements jsonb not null default '[]'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------- triggers
do $$
declare t text;
begin
  foreach t in array array['profiles','habits','habit_logs','streak_freezes','companion','inventory_items','adventures',
                           'shared_habits','shared_habit_members','friend_links','entitlements_cache','push_tokens']
  loop
    execute format('create trigger touch_%1$s before update on public.%1$I for each row execute function public.touch_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- RLS helpers
-- security definer so membership checks don't recurse through RLS.
create or replace function public.is_shared_member(p_habit_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from shared_habits sh
    join shared_habit_members m on m.shared_habit_id = sh.id and m.deleted_at is null
    where sh.habit_id = p_habit_id and sh.deleted_at is null and m.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------- policies
-- Owner-only tables: full CRUD on your own rows.
do $$
declare t text;
begin
  foreach t in array array['profiles','streak_freezes','companion','inventory_items','adventures','push_tokens']
  loop
    execute format($f$create policy "own rows" on public.%I for all
      using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))$f$, t);
  end loop;
end $$;

-- Habits: owners do everything; shared-habit members can read.
create policy "own habits" on public.habits for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "members read shared habits" on public.habits for select
  using (public.is_shared_member(id));

-- Logs: you write only your own logs; members of a shared habit can read each other's.
create policy "own logs" on public.habit_logs for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "members read shared logs" on public.habit_logs for select
  using (public.is_shared_member(habit_id));

create policy "owner manages share" on public.shared_habits for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "members read share" on public.shared_habits for select
  using (public.is_shared_member(habit_id));

create policy "see own memberships" on public.shared_habit_members for select
  using (user_id = (select auth.uid())
         or exists (select 1 from shared_habits sh where sh.id = shared_habit_id and sh.user_id = (select auth.uid())));
create policy "leave membership" on public.shared_habit_members for delete
  using (user_id = (select auth.uid()));
-- Joining goes through an Edge Function that validates the invite code (service role).

create policy "see own friend links" on public.friend_links for select
  using (user_id = (select auth.uid()) or addressee = (select auth.uid()));
create policy "request friend" on public.friend_links for insert
  with check (user_id = (select auth.uid()));
create policy "answer friend request" on public.friend_links for update
  using (addressee = (select auth.uid()) or user_id = (select auth.uid()));

-- Entitlements are written only by the RevenueCat webhook (service role). Clients may read.
create policy "read own entitlements" on public.entitlements_cache for select
  using (user_id = (select auth.uid()));

-- New users get a profile and a companion.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id);
  insert into companion (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
