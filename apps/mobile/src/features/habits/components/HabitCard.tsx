import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../../ui/Button';
import { cardShadow } from '../../../ui/Card';
import { Flame } from '../../../ui/Flame';
import { Heatmap } from '../../../ui/Heatmap';
import { PressableScale } from '../../../ui/PressableScale';
import { Text } from '../../../ui/Text';
import { useTheme } from '../../../ui/theme';
import { habitColor, radius, space, withAlpha } from '../../../ui/tokens';
import { amountLabel, scheduleLabel } from '../format';
import type { LocalDate } from '../logic/dates';
import { isScheduled, progressOn, valueOn } from '../logic/schedule';
import type { HabitStreak } from '../logic/streaks';
import type { Habit, LogMap } from '../types';
import { useCheckIn } from './useCheckIn';
import { WeekdayDots } from './WeekdayDots';

interface Props {
  habit: Habit;
  logs: LogMap;
  today: LocalDate;
  streak: HabitStreak;
  weekStartsOn: 0 | 1;
}

/** Overview card: seven-week heatmap on the left, identity and the check-in on the right. */
export const HabitCard = memo(function HabitCard({ habit, logs, today, streak, weekStartsOn }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const color = habitColor(t, habit.color);
  const { tap } = useCheckIn(habit, today);
  const progress = progressOn(habit, logs, today);
  const done = progress >= 1;
  const dueToday = isScheduled(habit, today);
  const amount = amountLabel(tr, habit, valueOn(logs, habit.id, today));

  const getProgress = useCallback((d: LocalDate) => (d < habit.startDate ? null : progressOn(habit, logs, d)), [habit, logs]);

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
      accessibilityLabel={habit.name}
      accessibilityHint={tr('a11y.openHabit')}
      style={[styles.card, { backgroundColor: t.card, shadowColor: t.scheme === 'dark' ? '#000' : '#1B1150' }]}
    >
      <View style={[styles.heat, { borderColor: t.separator }]}>
        <Heatmap getProgress={getProgress} today={today} color={color} weeks={7} cell={12} gap={3.5} weekStartsOn={weekStartsOn} />
      </View>
      <View style={styles.right}>
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>{habit.emoji}</Text>
          <Text variant="headline" numberOfLines={2} style={{ flexShrink: 1 }}>
            {habit.name}
          </Text>
        </View>
        <View style={styles.meta}>
          {streak.current > 0 ? (
            <View style={[styles.chip, { backgroundColor: withAlpha('#FF9500', 0.14) }]}>
              <Flame size={13} />
              <Text variant="caption" weight="700" color={t.flame} tabular>
                {streak.current}
              </Text>
            </View>
          ) : null}
          <Text variant="caption" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
            {scheduleLabel(tr, habit)}
          </Text>
        </View>
        <WeekdayDots habit={habit} color={color} weekStartsOn={weekStartsOn} />
        {dueToday || done ? (
          <Button
            label={done ? tr('habit.done') : amount && progress > 0 ? amount : tr('habit.checkIn')}
            icon={done ? 'checkmark-circle' : 'add'}
            size="md"
            color={color}
            variant={done ? 'secondary' : 'primary'}
            onPress={tap}
            style={styles.cta}
          />
        ) : (
          <View style={[styles.restDay, { backgroundColor: t.fill }]}>
            <Ionicons name="moon-outline" size={14} color={t.textSecondary} />
            <Text variant="footnote" tone="secondary">
              {tr('habit.notToday')}
            </Text>
          </View>
        )}
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: space.md,
    gap: space.md,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    ...cardShadow,
  },
  heat: { padding: 10, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, alignSelf: 'center' },
  right: { flex: 1, gap: 8, justifyContent: 'center', alignItems: 'flex-end' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end' },
  emoji: { fontSize: 20, lineHeight: 26 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, height: 22, borderRadius: 11 },
  cta: { alignSelf: 'stretch', marginTop: 2 },
  restDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'stretch',
    justifyContent: 'center',
    height: 44,
    borderRadius: 22,
  },
});
