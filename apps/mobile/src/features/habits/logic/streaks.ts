import type { Habit, LogMap } from '../types';
import { type LocalDate, addDays, diffDays, startOfWeek } from './dates';
import { isDone, isScheduled } from './schedule';

export interface HabitStreak {
  current: number;
  longest: number;
  /** "day" for day-based schedules, "week" for x_per_week habits. */
  unit: 'day' | 'week';
}

/** Hard cap on how far back streak walks go (~5 years). Keeps worst-case cost bounded. */
const MAX_LOOKBACK = 366 * 5;

/**
 * Streak for one habit.
 *
 * Rules:
 * - Unscheduled days are skipped; they never break or extend a streak.
 * - Today is "pending": not done yet does not break the streak.
 * - x_per_week habits count consecutive weeks that met the weekly target;
 *   the current week is pending until it ends.
 */
export function habitStreak(habit: Habit, logs: LogMap, today: LocalDate, weekStartsOn: 0 | 1 = 1): HabitStreak {
  if (habit.schedule.kind === 'x_per_week') {
    return weeklyStreak(habit, habit.schedule.times, logs, today, weekStartsOn);
  }

  const start = habit.startDate > addDays(today, -MAX_LOOKBACK) ? habit.startDate : addDays(today, -MAX_LOOKBACK);
  const span = diffDays(start, today);
  if (span < 0) return { current: 0, longest: 0, unit: 'day' };

  let run = 0;
  let longest = 0;
  for (let i = 0; i <= span; i++) {
    const d = addDays(start, i);
    if (!isScheduled(habit, d)) continue;
    if (isDone(habit, logs, d)) {
      run++;
      if (run > longest) longest = run;
    } else if (d !== today) {
      run = 0;
    }
  }
  return { current: run, longest, unit: 'day' };
}

function weeklyStreak(habit: Habit, times: number, logs: LogMap, today: LocalDate, weekStartsOn: 0 | 1): HabitStreak {
  const thisWeek = startOfWeek(today, weekStartsOn);
  let week = startOfWeek(habit.startDate, weekStartsOn);
  const earliest = startOfWeek(addDays(today, -MAX_LOOKBACK), weekStartsOn);
  if (week < earliest) week = earliest;

  let run = 0;
  let longest = 0;
  while (week <= thisWeek) {
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(week, i);
      if (d > today) break;
      if (d >= habit.startDate && isDone(habit, logs, d)) count++;
    }
    if (count >= times) {
      run++;
      if (run > longest) longest = run;
    } else if (week !== thisWeek) {
      run = 0;
    }
    week = addDays(week, 7);
  }
  return { current: run, longest, unit: 'week' };
}

export interface GlobalStreak {
  current: number;
  longest: number;
  todayDone: boolean;
}

/**
 * The app-wide "show up" streak (Duolingo-style): a day counts when at least one
 * habit was completed. Frozen days keep the streak alive without extending it.
 */
export function globalStreak(activeDates: ReadonlySet<LocalDate>, frozenDates: ReadonlySet<LocalDate>, today: LocalDate): GlobalStreak {
  const all = [...activeDates, ...frozenDates].filter((d) => d <= today).sort();
  const todayDone = activeDates.has(today);
  if (all.length === 0) return { current: 0, longest: 0, todayDone };

  let run = 0;
  let longest = 0;
  let prev: LocalDate | null = null;
  for (const d of all) {
    if (prev === d) continue;
    if (prev !== null && diffDays(prev, d) !== 1) run = 0;
    if (activeDates.has(d)) run++;
    if (run > longest) longest = run;
    prev = d;
  }
  // The run only counts as current if it reaches today or yesterday (today is pending).
  const last = all[all.length - 1];
  const current = diffDays(last, today) <= 1 ? run : 0;
  return { current, longest, todayDone };
}

export interface FreezeResult {
  /** Dates newly covered by a freeze. */
  frozen: LocalDate[];
  freezesLeft: number;
  /** True when missed days outnumbered the freezes and the streak was lost. */
  broken: boolean;
  /** The streak length that was lost, when broken. */
  lostStreak: number;
  /** Most recent active or frozen day before today — identifies which break this is. */
  lastCovered: LocalDate | null;
}

/**
 * Called once per app open. Looks at the days between the last active (or frozen)
 * day and yesterday. If the user has enough freezes to cover every missed day,
 * they're spent and the streak survives. Otherwise nothing is spent and the
 * streak is reported as broken so the UI can offer the comeback flow.
 */
export function applyFreezes(
  activeDates: ReadonlySet<LocalDate>,
  frozenDates: ReadonlySet<LocalDate>,
  freezes: number,
  today: LocalDate,
): FreezeResult {
  const yesterday = addDays(today, -1);
  const none: FreezeResult = { frozen: [], freezesLeft: freezes, broken: false, lostStreak: 0, lastCovered: null };
  const covered = [...activeDates, ...frozenDates].filter((d) => d < today).sort();
  const last = covered[covered.length - 1];
  if (!last) return none;
  none.lastCovered = last;
  const missed = diffDays(last, yesterday);
  if (missed <= 0) return none;

  const streakAtLast = globalStreak(activeDates, frozenDates, last).current;
  if (streakAtLast === 0) return none;

  if (missed <= freezes) {
    const frozen: LocalDate[] = [];
    for (let i = 1; i <= missed; i++) frozen.push(addDays(last, i));
    return { frozen, freezesLeft: freezes - missed, broken: false, lostStreak: 0, lastCovered: last };
  }
  return { frozen: [], freezesLeft: freezes, broken: true, lostStreak: streakAtLast, lastCovered: last };
}

/** Every date on which at least one habit hit its target. */
export function activeDatesFrom(habits: Habit[], logs: LogMap): Set<LocalDate> {
  const out = new Set<LocalDate>();
  for (const h of habits) {
    const byDate = logs[h.id];
    if (!byDate) continue;
    for (const d of Object.keys(byDate)) {
      if (isDone(h, logs, d)) out.add(d);
    }
  }
  return out;
}
