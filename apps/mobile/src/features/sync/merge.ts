import type { LocalDate } from '../habits/logic/dates';
import type { Habit, HabitColor, HabitType, LogMap, Schedule, TimeOfDay } from '../habits/types';

/**
 * Pure mapping + merge for last-write-wins sync.
 *
 * - `updated_at` is the *client* write time and decides who wins.
 * - `synced_at` is set by the server on every accepted write and is the pull cursor,
 *   so a device with a skewed clock can never hide rows from other devices.
 * - Deletes travel as tombstones (`deleted_at`).
 */

export interface HabitRow {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
  target_value: number;
  unit: string | null;
  schedule: Schedule;
  reminder_times: string[];
  time_of_day_group: string;
  start_date: string;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  synced_at?: string;
}

export interface LogRow {
  user_id: string;
  habit_id: string;
  local_date: string;
  value: number;
  source: 'manual';
  updated_at: string;
  deleted_at: string | null;
  synced_at?: string;
}

export interface FreezeRow {
  user_id: string;
  local_date: string;
  reason: 'freeze';
  updated_at: string;
  synced_at?: string;
  deleted_at?: string | null;
}

export interface SyncState {
  habits: Habit[];
  logs: LogMap;
  logStamps: Record<string, string>;
  habitTombstones: Record<string, string>;
  frozenDates: LocalDate[];
}

const t = (iso: string) => Date.parse(iso);
const newer = (a: string, b: string | undefined) => b === undefined || t(a) > t(b);
/** True when `stamp` is at or after `since` (or nothing has been pushed yet). */
const changedSince = (stamp: string, since: string | null) => since === null || t(stamp) >= t(since);

export function habitToRow(h: Habit, userId: string): HabitRow {
  return {
    id: h.id,
    user_id: userId,
    name: h.name,
    icon: h.emoji,
    color: h.color,
    type: h.type,
    target_value: h.target,
    unit: h.unit ?? null,
    schedule: h.schedule,
    reminder_times: h.reminderTime ? [h.reminderTime] : [],
    time_of_day_group: h.timeOfDay,
    start_date: h.startDate,
    sort_order: h.order,
    archived_at: h.archivedAt,
    created_at: h.createdAt || h.updatedAt,
    updated_at: h.updatedAt,
    deleted_at: null,
  };
}

export function rowToHabit(r: HabitRow): Habit {
  return {
    id: r.id,
    name: r.name,
    emoji: r.icon,
    color: r.color as HabitColor,
    type: r.type as HabitType,
    target: Number(r.target_value),
    unit: r.unit ?? undefined,
    schedule: r.schedule,
    timeOfDay: r.time_of_day_group as TimeOfDay,
    reminderTime: r.reminder_times[0] ?? null,
    startDate: r.start_date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    archivedAt: r.archived_at,
    order: r.sort_order,
  };
}

export interface PushSet {
  habits: HabitRow[];
  tombstones: { id: string; deleted_at: string }[];
  logs: LogRow[];
  freezes: FreezeRow[];
}

/** Everything written locally since the last successful push. */
export function collectPush(s: SyncState, since: string | null, userId: string): PushSet {
  const alive = new Set(s.habits.map((h) => h.id));
  const habits = s.habits.filter((h) => changedSince(h.updatedAt, since)).map((h) => habitToRow(h, userId));
  const tombstones = Object.entries(s.habitTombstones)
    .filter(([, at]) => changedSince(at, since))
    .map(([id, at]) => ({ id, deleted_at: at }));
  const logs: LogRow[] = [];
  for (const [key, stamp] of Object.entries(s.logStamps)) {
    if (!changedSince(stamp, since)) continue;
    const [habitId, date] = key.split('|');
    if (!alive.has(habitId)) continue;
    const value = s.logs[habitId]?.[date] ?? 0;
    logs.push({
      user_id: userId,
      habit_id: habitId,
      local_date: date,
      value,
      source: 'manual',
      updated_at: stamp,
      deleted_at: value > 0 ? null : stamp,
    });
  }
  const now = new Date().toISOString();
  const freezes = s.frozenDates.map((d) => ({ user_id: userId, local_date: d, reason: 'freeze' as const, updated_at: now }));
  return { habits, tombstones, logs, freezes };
}

export interface PullSet {
  habits: HabitRow[];
  logs: LogRow[];
  freezes: FreezeRow[];
}

/** Merge pulled rows into local state. Remote wins only when its client stamp is newer. */
export function applyPull(s: SyncState, pulled: PullSet): SyncState {
  const habits = new Map(s.habits.map((h) => [h.id, h]));
  const logs: LogMap = { ...s.logs };
  const logStamps = { ...s.logStamps };
  const habitTombstones = { ...s.habitTombstones };

  for (const r of pulled.habits) {
    const local = habits.get(r.id);
    if (r.deleted_at) {
      if (!local || newer(r.deleted_at, local.updatedAt) || t(r.deleted_at) === t(local.updatedAt)) {
        habits.delete(r.id);
        delete logs[r.id];
        delete habitTombstones[r.id];
      }
      continue;
    }
    if (habitTombstones[r.id] && !newer(r.updated_at, habitTombstones[r.id])) continue; // deleted here, later
    if (!local || newer(r.updated_at, local.updatedAt)) habits.set(r.id, rowToHabit(r));
  }

  for (const r of pulled.logs) {
    if (!habits.has(r.habit_id)) continue;
    const key = `${r.habit_id}|${r.local_date}`;
    if (!newer(r.updated_at, logStamps[key])) continue;
    const byDate = { ...(logs[r.habit_id] ?? {}) };
    const value = r.deleted_at ? 0 : Number(r.value);
    if (value > 0) byDate[r.local_date] = value;
    else delete byDate[r.local_date];
    logs[r.habit_id] = byDate;
    logStamps[key] = r.updated_at;
  }

  const frozen = new Set(s.frozenDates);
  for (const f of pulled.freezes) if (!f.deleted_at) frozen.add(f.local_date);

  return {
    habits: [...habits.values()].sort((a, b) => a.order - b.order),
    logs,
    logStamps,
    habitTombstones,
    frozenDates: [...frozen].sort(),
  };
}

/** Highest server cursor among pulled rows. */
export function maxSyncedAt(pulled: PullSet, current: string | null): string | null {
  let best = current;
  for (const r of [...pulled.habits, ...pulled.logs, ...pulled.freezes]) {
    if (r.synced_at && (best === null || t(r.synced_at) > t(best))) best = r.synced_at;
  }
  return best;
}
