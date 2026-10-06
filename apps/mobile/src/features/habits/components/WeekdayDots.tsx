import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '../../../ui/Text';
import { useTheme } from '../../../ui/theme';
import type { Habit } from '../types';

const ORDER_MON = [1, 2, 3, 4, 5, 6, 0];
const ORDER_SUN = [0, 1, 2, 3, 4, 5, 6];

/** Su Mo Tu … chips; filled when the habit is scheduled on that weekday. */
export function WeekdayDots({ habit, color, weekStartsOn }: { habit: Habit; color: string; weekStartsOn: 0 | 1 }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const days = weekStartsOn === 1 ? ORDER_MON : ORDER_SUN;
  const on = (d: number) => {
    const s = habit.schedule;
    if (s.kind === 'weekdays') return s.days.includes(d);
    if (s.kind === 'every_n_days') return s.n === 1;
    return true;
  };
  return (
    <View style={styles.row}>
      {days.map((d) => {
        const active = on(d);
        return (
          <View key={d} style={[styles.dot, { backgroundColor: active ? color : t.fill }]}>
            <Text variant="caption2" weight="700" color={active ? '#FFFFFF' : t.textTertiary} style={{ fontSize: 8.5 }}>
              {tr(`weekday.min.${d}`)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3 },
  dot: { width: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
