import type { Habit } from '../features/habits/types';

// Local reminders are a native feature; the web preview is a no-op.
export async function ensureNotificationPermission() {
  return false;
}
export async function cancelHabitReminders(_habitId: string) {}
export async function syncHabitReminders(_habit: Habit) {}
export async function scheduleAdventureReturn(_at: Date, _name: string) {}
