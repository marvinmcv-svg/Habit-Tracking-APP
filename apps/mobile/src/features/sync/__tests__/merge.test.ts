import type { Habit } from '../../habits/types';
import { type HabitRow, type SyncState, applyPull, collectPush, habitToRow, maxSyncedAt, rowToHabit } from '../merge';

const U = 'user-1';
const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Read',
  emoji: '📚',
  color: 'indigo',
  type: 'count',
  target: 3,
  unit: 'pages',
  schedule: { kind: 'weekdays', days: [1, 3] },
  timeOfDay: 'evening',
  reminderTime: '21:00',
  startDate: '2026-01-01',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  archivedAt: null,
  order: 0,
  ...over,
});
const state = (over: Partial<SyncState> = {}): SyncState => ({
  habits: [habit()],
  logs: {},
  logStamps: {},
  habitTombstones: {},
  frozenDates: [],
  ...over,
});
const row = (over: Partial<HabitRow> = {}): HabitRow => ({ ...habitToRow(habit(), U), ...over });

describe('row mapping', () => {
  it('round-trips a habit', () => {
    expect(rowToHabit(habitToRow(habit(), U))).toEqual(habit());
  });
  it('accepts Postgres timestamp and numeric formats', () => {
    const h = rowToHabit({ ...row(), target_value: '3' as unknown as number, updated_at: '2026-01-02T00:00:00+00:00' });
    expect(h.target).toBe(3);
  });
});

describe('collectPush', () => {
  it('pushes everything on first sync', () => {
    const s = state({
      logs: { h1: { '2026-01-05': 2 } },
      logStamps: { 'h1|2026-01-05': '2026-01-05T10:00:00.000Z' },
      frozenDates: ['2026-01-04'],
    });
    const p = collectPush(s, null, U);
    expect(p.habits).toHaveLength(1);
    expect(p.logs).toEqual([expect.objectContaining({ habit_id: 'h1', local_date: '2026-01-05', value: 2, deleted_at: null, user_id: U })]);
    expect(p.freezes).toEqual([expect.objectContaining({ local_date: '2026-01-04', user_id: U })]);
  });

  it('only pushes changes since the cursor, and sends cleared logs as tombstones', () => {
    const s = state({
      logStamps: { 'h1|2026-01-05': '2026-01-05T10:00:00.000Z', 'h1|2026-01-06': '2026-01-07T10:00:00.000Z' },
      habitTombstones: { gone: '2026-01-07T00:00:00.000Z' },
    });
    const p = collectPush(s, '2026-01-06T00:00:00.000Z', U);
    expect(p.habits).toHaveLength(0);
    expect(p.logs).toEqual([expect.objectContaining({ local_date: '2026-01-06', value: 0, deleted_at: '2026-01-07T10:00:00.000Z' })]);
    expect(p.tombstones).toEqual([{ id: 'gone', deleted_at: '2026-01-07T00:00:00.000Z' }]);
  });

  it('skips logs of habits that no longer exist locally', () => {
    const p = collectPush(state({ habits: [], logStamps: { 'h1|2026-01-05': '2026-01-05T10:00:00.000Z' } }), null, U);
    expect(p.logs).toHaveLength(0);
  });
});

describe('applyPull', () => {
  it('adds remote habits and newer edits, keeps newer local edits', () => {
    const remoteNew = row({ id: 'h2', name: 'Walk', updated_at: '2026-01-01T00:00:00+00:00' });
    const remoteOld = row({ name: 'Stale', updated_at: '2026-01-01T12:00:00+00:00' });
    const merged = applyPull(state(), { habits: [remoteNew, remoteOld], logs: [], freezes: [] });
    expect(merged.habits.map((h) => h.name).sort()).toEqual(['Read', 'Walk']);

    const remoteNewer = row({ name: 'Read more', updated_at: '2026-01-03T00:00:00+00:00' });
    expect(applyPull(state(), { habits: [remoteNewer], logs: [], freezes: [] }).habits[0].name).toBe('Read more');
  });

  it('applies remote deletes and drops their logs', () => {
    const s = state({ logs: { h1: { '2026-01-05': 1 } } });
    const merged = applyPull(s, { habits: [row({ deleted_at: '2026-01-09T00:00:00Z' })], logs: [], freezes: [] });
    expect(merged.habits).toHaveLength(0);
    expect(merged.logs.h1).toBeUndefined();
  });

  it('does not resurrect a habit deleted locally after the remote edit', () => {
    const s = state({ habits: [], habitTombstones: { h1: '2026-01-10T00:00:00.000Z' } });
    expect(applyPull(s, { habits: [row({ updated_at: '2026-01-05T00:00:00Z' })], logs: [], freezes: [] }).habits).toHaveLength(0);
  });

  it('merges logs by stamp, including remote clears', () => {
    const s = state({
      logs: { h1: { '2026-01-05': 1, '2026-01-06': 3 } },
      logStamps: { 'h1|2026-01-05': '2026-01-05T10:00:00.000Z', 'h1|2026-01-06': '2026-01-08T00:00:00.000Z' },
    });
    const base = { user_id: U, habit_id: 'h1', source: 'manual' as const };
    const merged = applyPull(s, {
      habits: [],
      logs: [
        { ...base, local_date: '2026-01-05', value: 3, updated_at: '2026-01-05T11:00:00Z', deleted_at: null }, // newer → wins
        { ...base, local_date: '2026-01-06', value: 0, updated_at: '2026-01-07T00:00:00Z', deleted_at: '2026-01-07T00:00:00Z' }, // older → ignored
        { ...base, local_date: '2026-01-07', value: 2, updated_at: '2026-01-07T00:00:00Z', deleted_at: null }, // new
        { ...base, habit_id: 'unknown', local_date: '2026-01-07', value: 2, updated_at: '2026-01-07T00:00:00Z', deleted_at: null },
      ],
      freezes: [{ user_id: U, local_date: '2026-01-02', reason: 'freeze', updated_at: '' }],
    });
    expect(merged.logs.h1).toEqual({ '2026-01-05': 3, '2026-01-06': 3, '2026-01-07': 2 });
    expect(merged.logs.unknown).toBeUndefined();
    expect(merged.frozenDates).toEqual(['2026-01-02']);

    const cleared = applyPull(merged, {
      habits: [],
      logs: [{ ...base, local_date: '2026-01-07', value: 0, updated_at: '2026-01-09T00:00:00Z', deleted_at: '2026-01-09T00:00:00Z' }],
      freezes: [],
    });
    expect(cleared.logs.h1['2026-01-07']).toBeUndefined();
  });

  it('tracks the highest server cursor', () => {
    expect(
      maxSyncedAt(
        {
          habits: [row({ synced_at: '2026-01-02T00:00:00Z' })],
          logs: [],
          freezes: [{ user_id: U, local_date: 'x', reason: 'freeze', updated_at: '', synced_at: '2026-01-03T00:00:00Z' }],
        },
        '2026-01-01T00:00:00Z',
      ),
    ).toBe('2026-01-03T00:00:00Z');
  });
});
