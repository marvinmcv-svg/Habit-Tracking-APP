import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { haptics } from '../../../lib/haptics';
import { PressableScale } from '../../../ui/PressableScale';
import { Text } from '../../../ui/Text';
import { useTheme } from '../../../ui/theme';
import { withAlpha } from '../../../ui/tokens';
import { formatDate } from '../format';
import { type LocalDate, addDays, addMonths, dayOfWeek, daysInMonth, startOfMonth } from '../logic/dates';

interface Props {
  today: LocalDate;
  color: string;
  weekStartsOn: 0 | 1;
  /** null = not scheduled / before start. */
  progressFor: (d: LocalDate) => number | null;
  onToggle: (d: LocalDate) => void;
  minDate: LocalDate;
}

/** Month view. Past days are tappable so history can be corrected. */
export function MonthCalendar({ today, color, weekStartsOn, progressFor, onToggle, minDate }: Props) {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const [month, setMonth] = useState(startOfMonth(today));
  const lead = (dayOfWeek(month) - weekStartsOn + 7) % 7;
  const count = daysInMonth(month);
  const cells: (LocalDate | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => addDays(month, i))];
  while (cells.length % 7) cells.push(null);
  const headers = Array.from({ length: 7 }, (_, i) => (i + weekStartsOn) % 7);
  const canNext = month < startOfMonth(today);
  const canPrev = month > startOfMonth(minDate);

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.head}>
        <PressableScale
          disabled={!canPrev}
          onPress={() => setMonth(addMonths(month, -1))}
          accessibilityLabel={tr('a11y.prevMonth')}
          style={styles.nav}
        >
          <Ionicons name="chevron-back" size={20} color={t.accent} />
        </PressableScale>
        <Text variant="headline">{formatDate(month, i18n.language, { month: 'long', year: 'numeric' })}</Text>
        <PressableScale
          disabled={!canNext}
          onPress={() => setMonth(addMonths(month, 1))}
          accessibilityLabel={tr('a11y.nextMonth')}
          style={styles.nav}
        >
          <Ionicons name="chevron-forward" size={20} color={t.accent} />
        </PressableScale>
      </View>
      <View style={styles.row}>
        {headers.map((d) => (
          <Text key={d} variant="caption2" tone="secondary" align="center" style={styles.cell}>
            {tr(`weekday.min.${d}`)}
          </Text>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, w) => (
        <View key={w} style={styles.row}>
          {cells.slice(w * 7, w * 7 + 7).map((d, i) => {
            if (!d) return <View key={i} style={styles.cell} />;
            const future = d > today;
            const p = future || d < minDate ? null : progressFor(d);
            const done = p !== null && p >= 1;
            const partial = p !== null && p > 0 && p < 1;
            const isToday = d === today;
            return (
              <View key={i} style={styles.cell}>
                <PressableScale
                  disabled={future || d < minDate}
                  scaleTo={0.88}
                  onPress={() => {
                    haptics.selection();
                    onToggle(d);
                  }}
                  accessibilityLabel={formatDate(d, i18n.language, { weekday: 'long', month: 'long', day: 'numeric' })}
                  accessibilityState={{ checked: done }}
                  style={[
                    styles.day,
                    done && { backgroundColor: color },
                    partial && { backgroundColor: withAlpha(color, 0.3) },
                    p === 0 && !isToday && { backgroundColor: t.fill },
                    isToday && !done && { borderWidth: 2, borderColor: color },
                  ]}
                >
                  <Text
                    variant="footnote"
                    weight={isToday ? '800' : '500'}
                    color={done ? '#FFFFFF' : future || p === null ? t.textTertiary : t.text}
                    tabular
                  >
                    {Number(d.slice(8))}
                  </Text>
                </PressableScale>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center' },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
