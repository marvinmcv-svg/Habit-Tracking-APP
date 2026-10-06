import type { Habit, LogMap } from '../types';
import { type LocalDate, dayOfWeek, diffDays } from './dates';

/** Whether the habit is expected on this date. x_per_week habits may be done on any day. */
export function isScheduled(habit: Pick<Habit, 'schedule' | 'startDate'>, date: LocalDate): boolean {
  if (date < habit.startDate) return false;
  const s = habit.schedule;
  switch (s.kind) {
    case 'daily':
    case 'x_per_week':
      return true;
    case 'weekdays':
      return s.days.includes(dayOfWeek(date));
    case 'every_n_days':
      return diffDays(habit.startDate, date) % Math.max(1, s.n) === 0;
  }
}

export function effectiveTarget(habit: Pick<Habit, 'type' | 'target'>): number {
  return habit.type === 'boolean' || habit.type === 'quit' ? 1 : Math.max(1, habit.target);
}

export function valueOn(logs: LogMap, habitId: string, date: LocalDate): number {
  return logs[habitId]?.[date] ?? 0;
}

export function isDone(habit: Pick<Habit, 'id' | 'type' | 'target'>, logs: LogMap, date: LocalDate): boolean {
  return valueOn(logs, habit.id, date) >= effectiveTarget(habit);
}

/** 0…1 progress for a single day. */
export function progressOn(habit: Pick<Habit, 'id' | 'type' | 'target'>, logs: LogMap, date: LocalDate): number {
  return Math.min(1, valueOn(logs, habit.id, date) / effectiveTarget(habit));
}

/** Active (not archived) habits that are due on the date, in display order. */
export function dueHabits(habits: Habit[], date: LocalDate): Habit[] {
  return habits.filter((h) => !h.archivedAt && isScheduled(h, date)).sort((a, b) => a.order - b.order);
}
