import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Habit } from '../features/habits/types';
import i18n from './i18n';

const PREFIX = 'habit-reminder:';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reminders', {
    name: i18n.t('notifications.channel'),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function cancelHabitReminders(habitId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(`${PREFIX}${habitId}:`))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Re-schedules local reminders for one habit. Safe to call on every edit. */
export async function syncHabitReminders(habit: Habit) {
  try {
    await cancelHabitReminders(habit.id);
    if (!habit.reminderTime || habit.archivedAt) return;
    const granted = await ensureNotificationPermission();
    if (!granted) return;
    await ensureChannel();

    const [hour, minute] = habit.reminderTime.split(':').map(Number);
    const content: Notifications.NotificationContentInput = {
      title: `${habit.emoji} ${habit.name}`,
      body: i18n.t('notifications.body'),
      data: { habitId: habit.id },
    };
    const channelId = Platform.OS === 'android' ? 'reminders' : undefined;

    if (habit.schedule.kind === 'weekdays') {
      for (const day of habit.schedule.days) {
        await Notifications.scheduleNotificationAsync({
          identifier: `${PREFIX}${habit.id}:${day}`,
          content,
          // expo-notifications weekdays are 1 = Sunday … 7 = Saturday.
          trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: day + 1, hour, minute, channelId },
        });
      }
      return;
    }
    // Daily, x-per-week and every-n-days all get a daily nudge; the copy is gentle by design.
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}${habit.id}:daily`,
      content,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId },
    });
  } catch (e) {
    if (__DEV__) console.warn('[notifications]', e);
  }
}
