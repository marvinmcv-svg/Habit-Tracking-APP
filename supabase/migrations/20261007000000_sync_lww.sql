-- Last-write-wins sync for the tables the app syncs.
--
-- updated_at  = the client's write time; it decides which write wins.
-- synced_at   = set by the server (clock_timestamp, unique per row) on every accepted
--               write; clients pull with "synced_at > cursor", so a device with a skewed
--               clock can never hide rows from other devices.
-- A write whose updated_at is older than the stored row is ignored (stale device).

alter table public.habits add column synced_at timestamptz not null default clock_timestamp();
alter table public.habit_logs add column synced_at timestamptz not null default clock_timestamp();
alter table public.streak_freezes add column synced_at timestamptz not null default clock_timestamp();

create index habits_user_synced on public.habits (user_id, synced_at);
create index habit_logs_user_synced on public.habit_logs (user_id, synced_at);
create index streak_freezes_user_synced on public.streak_freezes (user_id, synced_at);

create or replace function public.lww_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null; -- stale write: keep the newer row untouched
  end if;
  new.synced_at = clock_timestamp();
  return new;
end $$;

drop trigger touch_habits on public.habits;
drop trigger touch_habit_logs on public.habit_logs;
drop trigger touch_streak_freezes on public.streak_freezes;

create trigger lww_habits before insert or update on public.habits for each row execute function public.lww_guard();
create trigger lww_habit_logs before insert or update on public.habit_logs for each row execute function public.lww_guard();
create trigger lww_streak_freezes before insert or update on public.streak_freezes for each row execute function public.lww_guard();
