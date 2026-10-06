import type { Habit, LogMap } from '../types';
import { type LocalDate, addDays, dayOfWeek } from './dates';
import { dueHabits, isDone, isScheduled } from './schedule';

export interface CompletionRate {
  done: number;
  due: number;
  rate: number; // 0…1, 0 when nothing was due
}

/** Completion over the `days` days ending today (inclusive). */
export function completionRate(habits: Habit[], logs: LogMap, today: LocalDate, days: number): CompletionRate {
  let done = 0;
  let due = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i);
    for (const h of habits) {
      if (h.archivedAt || !isScheduled(h, d)) continue;
      due++;
      if (isDone(h, logs, d)) done++;
    }
  }
  return { done, due, rate: due === 0 ? 0 : done / due };
}

/** Per-day completion ratio for a chart, oldest first. */
export function dailySeries(habits: Habit[], logs: LogMap, today: LocalDate, days: number) {
  const out: { date: LocalDate; rate: number; done: number; due: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const due = dueHabits(habits, d);
    const done = due.filter((h) => isDone(h, logs, d)).length;
    out.push({ date: d, rate: due.length ? done / due.length : 0, done, due: due.length });
  }
  return out;
}

/** A day where every scheduled habit was completed (and at least one was due). */
export function isPerfectDay(habits: Habit[], logs: LogMap, date: LocalDate): boolean {
  const due = dueHabits(habits, date);
  return due.length > 0 && due.every((h) => isDone(h, logs, date));
}

export interface LifetimeTotals {
  checkins: number;
  perfectDays: number;
  morning: number;
  evening: number;
  weekend: number;
}

export function lifetimeTotals(habits: Habit[], logs: LogMap): LifetimeTotals {
  const totals: LifetimeTotals = { checkins: 0, perfectDays: 0, morning: 0, evening: 0, weekend: 0 };
  const dates = new Set<LocalDate>();
  for (const h of habits) {
    const byDate = logs[h.id];
    if (!byDate) continue;
    for (const d of Object.keys(byDate)) {
      if (!isDone(h, logs, d)) continue;
      totals.checkins++;
      dates.add(d);
      if (h.timeOfDay === 'morning') totals.morning++;
      if (h.timeOfDay === 'evening') totals.evening++;
      const dow = dayOfWeek(d);
      if (dow === 0 || dow === 6) totals.weekend++;
    }
  }
  for (const d of dates) if (isPerfectDay(habits, logs, d)) totals.perfectDays++;
  return totals;
}

/** Intensity 0…4 for heatmap cells. */
export function intensity(progress: number): 0 | 1 | 2 | 3 | 4 {
  if (progress <= 0) return 0;
  if (progress < 0.34) return 1;
  if (progress < 0.67) return 2;
  if (progress < 1) return 3;
  return 4;
}
