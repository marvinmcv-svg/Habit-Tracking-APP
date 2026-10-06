import type { Habit, LogMap, Schedule } from '../../types';
import { addDays, dateRange, dayOfWeek, diffDays, startOfWeek, toLocalDate, daysInMonth, addMonths } from '../dates';
import { isScheduled, isDone, progressOn, dueHabits } from '../schedule';
import { habitStreak, globalStreak, applyFreezes, activeDatesFrom } from '../streaks';
import { completionRate, isPerfectDay, lifetimeTotals, intensity, dailySeries } from '../stats';
import { levelFromXp, stageForLevel, totalXp } from '../../../gamification/progression';
import { achievementProgress } from '../../../gamification/achievements';

function habit(over: Partial<Habit> & { schedule?: Schedule } = {}): Habit {
  return {
    id: over.id ?? 'h1',
    name: 'Read',
    emoji: '📚',
    color: 'blue',
    type: 'boolean',
    target: 1,
    schedule: { kind: 'daily' },
    timeOfDay: 'anytime',
    reminderTime: null,
    startDate: '2026-01-01',
    createdAt: '',
    updatedAt: '',
    archivedAt: null,
    order: 0,
    ...over,
  };
}

function logsFor(id: string, dates: string[], value = 1): LogMap {
  return { [id]: Object.fromEntries(dates.map((d) => [d, value])) };
}

describe('dates', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29'); // leap year
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('is unaffected by DST transitions (TZ=America/New_York in tests)', () => {
    // US DST starts 2026-03-08 and ends 2026-11-01.
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(diffDays('2026-03-07', '2026-03-09')).toBe(2);
    expect(diffDays('2026-10-31', '2026-11-02')).toBe(2);
    // An instant at 23:30 local on the spring-forward day still maps to that date.
    expect(toLocalDate(new Date(2026, 2, 8, 23, 30))).toBe('2026-03-08');
    expect(toLocalDate(new Date(2026, 10, 1, 0, 30))).toBe('2026-11-01');
  });

  it('computes weekdays and week starts', () => {
    expect(dayOfWeek('2026-10-06')).toBe(2); // Tuesday
    expect(startOfWeek('2026-10-06', 1)).toBe('2026-10-05');
    expect(startOfWeek('2026-10-06', 0)).toBe('2026-10-04');
    expect(startOfWeek('2026-10-05', 1)).toBe('2026-10-05');
  });

  it('handles ranges and months', () => {
    expect(dateRange('2026-01-30', '2026-02-02')).toEqual(['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02']);
    expect(dateRange('2026-02-02', '2026-01-30')).toEqual([]);
    expect(daysInMonth('2026-02-10')).toBe(28);
    expect(daysInMonth('2028-02-10')).toBe(29);
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-01');
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-01');
  });
});

describe('schedule', () => {
  it('never schedules before the start date', () => {
    expect(isScheduled(habit(), '2025-12-31')).toBe(false);
    expect(isScheduled(habit(), '2026-01-01')).toBe(true);
  });

  it('respects specific weekdays', () => {
    const h = habit({ schedule: { kind: 'weekdays', days: [1, 3, 5] } });
    expect(isScheduled(h, '2026-10-05')).toBe(true); // Mon
    expect(isScheduled(h, '2026-10-06')).toBe(false); // Tue
  });

  it('respects every-n-days from the start date', () => {
    const h = habit({ schedule: { kind: 'every_n_days', n: 3 } });
    expect(isScheduled(h, '2026-01-01')).toBe(true);
    expect(isScheduled(h, '2026-01-02')).toBe(false);
    expect(isScheduled(h, '2026-01-04')).toBe(true);
  });

  it('treats count habits as done only at target', () => {
    const h = habit({ type: 'count', target: 8 });
    const logs = logsFor('h1', ['2026-02-01'], 5);
    expect(isDone(h, logs, '2026-02-01')).toBe(false);
    expect(progressOn(h, logs, '2026-02-01')).toBeCloseTo(5 / 8);
    expect(isDone(h, logsFor('h1', ['2026-02-01'], 9), '2026-02-01')).toBe(true);
  });

  it('lists due habits excluding archived, in order', () => {
    const a = habit({ id: 'a', order: 2 });
    const b = habit({ id: 'b', order: 1 });
    const c = habit({ id: 'c', archivedAt: 'x' });
    expect(dueHabits([a, b, c], '2026-02-01').map((h) => h.id)).toEqual(['b', 'a']);
  });
});

describe('habitStreak', () => {
  const today = '2026-02-10';

  it('counts consecutive completed days and treats today as pending', () => {
    const h = habit();
    const logs = logsFor('h1', ['2026-02-07', '2026-02-08', '2026-02-09']);
    expect(habitStreak(h, logs, today)).toEqual({ current: 3, longest: 3, unit: 'day' });
    const withToday = logsFor('h1', ['2026-02-07', '2026-02-08', '2026-02-09', today]);
    expect(habitStreak(h, withToday, today).current).toBe(4);
  });

  it('breaks on a missed past day but keeps the longest run', () => {
    const h = habit();
    const logs = logsFor('h1', ['2026-02-01', '2026-02-02', '2026-02-03', '2026-02-04', '2026-02-08', '2026-02-09']);
    expect(habitStreak(h, logs, today)).toEqual({ current: 2, longest: 4, unit: 'day' });
  });

  it('skips unscheduled days without breaking', () => {
    // Mon/Wed/Fri habit; 2026-02-02 is a Monday.
    const h = habit({ schedule: { kind: 'weekdays', days: [1, 3, 5] } });
    const logs = logsFor('h1', ['2026-02-02', '2026-02-04', '2026-02-06', '2026-02-09']);
    expect(habitStreak(h, logs, today).current).toBe(4);
  });

  it('counts weeks for x-per-week habits', () => {
    const h = habit({ schedule: { kind: 'x_per_week', times: 2 }, startDate: '2026-01-19' });
    // Weeks (Mon start): Jan 19, Jan 26, Feb 2, Feb 9 (current, pending)
    const logs = logsFor('h1', ['2026-01-20', '2026-01-22', '2026-01-27', '2026-01-29', '2026-02-03', '2026-02-05']);
    expect(habitStreak(h, logs, today)).toEqual({ current: 3, longest: 3, unit: 'week' });
    const missedWeek = logsFor('h1', ['2026-01-20', '2026-01-22', '2026-02-03', '2026-02-05']);
    expect(habitStreak(h, missedWeek, today)).toEqual({ current: 1, longest: 1, unit: 'week' });
  });

  it('returns zero for a habit starting in the future', () => {
    expect(habitStreak(habit({ startDate: '2026-03-01' }), {}, today).current).toBe(0);
  });
});

describe('globalStreak', () => {
  const today = '2026-02-10';

  it('counts consecutive active days ending yesterday or today', () => {
    const active = new Set(['2026-02-07', '2026-02-08', '2026-02-09']);
    expect(globalStreak(active, new Set(), today)).toEqual({ current: 3, longest: 3, todayDone: false });
    active.add(today);
    expect(globalStreak(active, new Set(), today)).toEqual({ current: 4, longest: 4, todayDone: true });
  });

  it('is zero when the last active day was two days ago', () => {
    const active = new Set(['2026-02-07', '2026-02-08']);
    expect(globalStreak(active, new Set(), today).current).toBe(0);
    expect(globalStreak(active, new Set(), today).longest).toBe(2);
  });

  it('bridges frozen days without counting them', () => {
    const active = new Set(['2026-02-06', '2026-02-07', '2026-02-09']);
    const frozen = new Set(['2026-02-08']);
    expect(globalStreak(active, frozen, today).current).toBe(3);
  });

  it('ignores future dates', () => {
    expect(globalStreak(new Set(['2026-02-11']), new Set(), today).current).toBe(0);
  });
});

describe('applyFreezes', () => {
  const today = '2026-02-10';

  it('does nothing when yesterday was active', () => {
    const r = applyFreezes(new Set(['2026-02-08', '2026-02-09']), new Set(), 2, today);
    expect(r).toMatchObject({ frozen: [], freezesLeft: 2, broken: false });
  });

  it('spends freezes to cover missed days', () => {
    const r = applyFreezes(new Set(['2026-02-06', '2026-02-07']), new Set(), 2, today);
    expect(r).toMatchObject({ frozen: ['2026-02-08', '2026-02-09'], freezesLeft: 0, broken: false });
    // And the streak survives.
    expect(globalStreak(new Set(['2026-02-06', '2026-02-07']), new Set(r.frozen), today).current).toBe(2);
  });

  it('reports a break without spending when freezes are not enough', () => {
    const r = applyFreezes(new Set(['2026-02-04', '2026-02-05']), new Set(), 2, today);
    expect(r).toMatchObject({ frozen: [], freezesLeft: 2, broken: true, lostStreak: 2, lastCovered: '2026-02-05' });
  });

  it('does nothing when there is no streak to protect', () => {
    expect(applyFreezes(new Set(), new Set(), 2, today).broken).toBe(false);
  });
});

describe('stats', () => {
  const today = '2026-02-10';

  it('computes completion rate over a window', () => {
    const a = habit({ id: 'a' });
    const b = habit({ id: 'b' });
    const logs: LogMap = { a: { [today]: 1, '2026-02-09': 1 }, b: { [today]: 1 } };
    expect(completionRate([a, b], logs, today, 2)).toEqual({ done: 3, due: 4, rate: 0.75 });
    expect(completionRate([], logs, today, 7).rate).toBe(0);
  });

  it('detects perfect days and lifetime totals', () => {
    const a = habit({ id: 'a', timeOfDay: 'morning' });
    const b = habit({ id: 'b', timeOfDay: 'evening' });
    const logs: LogMap = { a: { '2026-02-07': 1, '2026-02-08': 1 }, b: { '2026-02-07': 1 } };
    expect(isPerfectDay([a, b], logs, '2026-02-07')).toBe(true);
    expect(isPerfectDay([a, b], logs, '2026-02-08')).toBe(false);
    // 2026-02-07 is a Saturday, 2026-02-08 a Sunday.
    expect(lifetimeTotals([a, b], logs)).toEqual({ checkins: 3, perfectDays: 1, morning: 2, evening: 1, weekend: 3 });
    expect(activeDatesFrom([a, b], logs)).toEqual(new Set(['2026-02-07', '2026-02-08']));
  });

  it('builds a daily series oldest-first', () => {
    const a = habit({ id: 'a' });
    const s = dailySeries([a], { a: { [today]: 1 } }, today, 3);
    expect(s.map((x) => x.rate)).toEqual([0, 0, 1]);
    expect(s[2].date).toBe(today);
  });

  it('maps progress to heatmap intensity', () => {
    expect([0, 0.2, 0.5, 0.9, 1].map(intensity)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('progression', () => {
  it('levels up with growing thresholds', () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, into: 0, needed: 50 });
    expect(levelFromXp(50)).toMatchObject({ level: 2, into: 0, needed: 75 });
    expect(levelFromXp(130).level).toBe(3);
  });

  it('maps levels to companion stages', () => {
    expect([1, 2, 3, 6, 9, 10, 15, 40].map(stageForLevel)).toEqual([0, 0, 1, 2, 2, 3, 4, 4]);
  });

  it('derives xp from totals', () => {
    expect(totalXp({ checkins: 3, perfectDays: 1 })).toBe(50);
  });

  it('computes achievement tiers', () => {
    const p = achievementProgress({
      checkins: 55,
      perfectDays: 0,
      morning: 0,
      evening: 0,
      weekend: 0,
      longestStreak: 7,
      habitsCreated: 3,
      comebacks: 0,
    });
    const committed = p.find((a) => a.def.key === 'committed')!;
    expect(committed).toMatchObject({ tier: 2, shownValue: 50, next: 100 });
    expect(committed.progress).toBeCloseTo(0.1);
    const flame = p.find((a) => a.def.key === 'flame')!;
    expect(flame).toMatchObject({ tier: 2, shownValue: 7, next: 14 });
    const perfect = p.find((a) => a.def.key === 'perfectionist')!;
    expect(perfect).toMatchObject({ tier: 0, shownValue: 1, progress: 0 });
  });
});
