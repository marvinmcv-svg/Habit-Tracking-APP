import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { type LocalDate, addDays, startOfWeek } from '../features/habits/logic/dates';
import { intensity } from '../features/habits/logic/stats';
import { useTheme } from './theme';
import { withAlpha } from './tokens';

interface Props {
  /** Progress 0…1 for a date, or null when the habit wasn't due / didn't exist yet. */
  getProgress: (date: LocalDate) => number | null;
  today: LocalDate;
  color: string;
  weeks?: number;
  cell?: number;
  gap?: number;
  weekStartsOn?: 0 | 1;
}

const ALPHA = [0, 0.3, 0.5, 0.75, 1];

/** GitHub-style grid: columns are weekdays, rows are weeks, newest week at the bottom. */
export const Heatmap = memo(function Heatmap({ getProgress, today, color, weeks = 7, cell = 13, gap = 4, weekStartsOn = 1 }: Props) {
  const t = useTheme();
  const first = addDays(startOfWeek(today, weekStartsOn), -(weeks - 1) * 7);
  const rows = [];
  for (let w = 0; w < weeks; w++) {
    const cells = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(first, w * 7 + d);
      const future = date > today;
      const p = future ? null : getProgress(date);
      const level = p === null ? 0 : intensity(p);
      const bg = level === 0 ? t.heatEmpty : withAlpha(color, ALPHA[level]);
      cells.push(
        <View
          key={d}
          style={[
            { width: cell, height: cell, borderRadius: cell * 0.28, backgroundColor: bg, opacity: future ? 0.35 : 1 },
            date === today && { borderWidth: 1.5, borderColor: color },
          ]}
        />,
      );
    }
    rows.push(
      <View key={w} style={[styles.row, { gap }]}>
        {cells}
      </View>,
    );
  }
  return (
    <View style={{ gap }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {rows}
    </View>
  );
});

const styles = StyleSheet.create({ row: { flexDirection: 'row' } });
