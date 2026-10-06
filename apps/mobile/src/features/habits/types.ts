import type { LocalDate } from './logic/dates';

export type HabitType = 'boolean' | 'count' | 'duration' | 'quit';

export type Schedule =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: number[] } // 0 = Sunday … 6 = Saturday
  | { kind: 'x_per_week'; times: number }
  | { kind: 'every_n_days'; n: number };

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

export type HabitColor = 'blue' | 'purple' | 'indigo' | 'teal' | 'green' | 'orange' | 'pink' | 'red' | 'yellow' | 'mint';

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: HabitColor;
  type: HabitType;
  /** Value that counts as "done" for the day. Always 1 for boolean and quit habits. */
  target: number;
  /** Free-text unit for count habits ("glasses", "pages"). Duration habits are always minutes. */
  unit?: string;
  schedule: Schedule;
  timeOfDay: TimeOfDay;
  /** "HH:MM" in the user's local time, or null for no reminder. */
  reminderTime: string | null;
  startDate: LocalDate;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  order: number;
}

/** logs[habitId][localDate] = value logged that day. */
export type LogMap = Record<string, Record<LocalDate, number>>;
