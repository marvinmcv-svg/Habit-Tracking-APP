import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useHabitStore } from '../features/habits/store';

/**
 * One haptic per user action, fired in the same frame as the visual change.
 * Never the only feedback — the UI always changes too.
 */
function enabled() {
  return Platform.OS !== 'web' && useHabitStore.getState().settings.haptics;
}

export const haptics = {
  selection: () => enabled() && Haptics.selectionAsync().catch(() => {}),
  light: () => enabled() && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  medium: () => enabled() && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  success: () => enabled() && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warning: () => enabled() && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
};
