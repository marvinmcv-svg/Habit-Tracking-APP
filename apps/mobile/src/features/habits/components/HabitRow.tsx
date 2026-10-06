import { router } from 'expo-router';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Flame } from '../../../ui/Flame';
import { PressableScale } from '../../../ui/PressableScale';
import { Text } from '../../../ui/Text';
import { useTheme } from '../../../ui/theme';
import { habitColor, radius, space, withAlpha } from '../../../ui/tokens';
import { cardShadow } from '../../../ui/Card';
import { amountLabel } from '../format';
import type { LocalDate } from '../logic/dates';
import type { HabitStreak } from '../logic/streaks';
import type { Habit } from '../types';
import { CheckButton } from './CheckButton';
import { useCheckIn } from './useCheckIn';

interface Props {
  habit: Habit;
  value: number;
  progress: number;
  streak: HabitStreak;
  date: LocalDate;
}

export const HabitRow = memo(function HabitRow({ habit, value, progress, streak, date }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const color = habitColor(t, habit.color);
  const { tap, reset } = useCheckIn(habit, date);
  const done = progress >= 1;
  const amount = amountLabel(tr, habit, value);
  const stepped = habit.type === 'count' || habit.type === 'duration';

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
      accessibilityLabel={habit.name}
      accessibilityHint={tr('a11y.openHabit')}
      style={[styles.row, { backgroundColor: t.card, shadowColor: t.scheme === 'dark' ? '#000' : '#1B1150' }]}
    >
      <View style={[styles.tile, { backgroundColor: withAlpha(color, t.scheme === 'dark' ? 0.22 : 0.14) }]}>
        <Text style={styles.emoji}>{habit.emoji}</Text>
      </View>
      <View style={styles.body}>
        <Text
          variant="headline"
          numberOfLines={1}
          tone={done ? 'secondary' : 'primary'}
          style={done ? { textDecorationLine: 'line-through' } : null}
        >
          {habit.name}
        </Text>
        <View style={styles.meta}>
          {streak.current > 0 ? (
            <View style={styles.streak}>
              <Flame size={14} />
              <Text variant="footnote" weight="600" color={t.flame} tabular>
                {streak.unit === 'week'
                  ? tr('streak.weeksShort', { count: streak.current })
                  : tr('streak.daysShort', { count: streak.current })}
              </Text>
            </View>
          ) : null}
          {amount ? (
            <Text variant="footnote" tone="secondary" numberOfLines={1} tabular>
              {amount}
            </Text>
          ) : (
            <Text variant="footnote" tone="secondary" numberOfLines={1}>
              {habit.type === 'quit' ? tr('habit.quitPrompt') : done ? tr('habit.doneToday') : tr('habit.tapToComplete')}
            </Text>
          )}
        </View>
      </View>
      <CheckButton
        color={color}
        progress={progress}
        stepped={stepped}
        onPress={tap}
        onLongPress={reset}
        label={done ? tr('a11y.markNotDone', { name: habit.name }) : tr('a11y.checkIn', { name: habit.name })}
      />
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    paddingRight: space.lg,
    gap: space.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    ...cardShadow,
  },
  tile: { width: 48, height: 48, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 24, lineHeight: 30 },
  body: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
