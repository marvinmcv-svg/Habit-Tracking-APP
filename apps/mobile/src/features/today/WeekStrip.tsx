import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { haptics } from '../../lib/haptics';
import { PressableScale } from '../../ui/PressableScale';
import { ProgressRing } from '../../ui/ProgressRing';
import { Text } from '../../ui/Text';
import { useTheme } from '../../ui/theme';
import { type LocalDate, addDays, dayOfWeek, startOfWeek } from '../habits/logic/dates';

interface Props {
  today: LocalDate;
  selected: LocalDate;
  weekStartsOn: 0 | 1;
  progressFor: (d: LocalDate) => number;
  onSelect: (d: LocalDate) => void;
}

/** The current week. Each day wears a tiny ring of that day's completion. */
export function WeekStrip({ today, selected, weekStartsOn, progressFor, onSelect }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const start = startOfWeek(today, weekStartsOn);
  return (
    <View style={styles.row}>
      {Array.from({ length: 7 }, (_, i) => {
        const d = addDays(start, i);
        const future = d > today;
        const isSel = d === selected;
        const isToday = d === today;
        const p = future ? 0 : progressFor(d);
        return (
          <PressableScale
            key={d}
            disabled={future}
            scaleTo={0.94}
            accessibilityLabel={tr(`weekday.long.${dayOfWeek(d)}`)}
            accessibilityState={{ selected: isSel }}
            onPress={() => {
              if (!isSel) {
                haptics.selection();
                onSelect(d);
              }
            }}
            style={[styles.day, isSel && { backgroundColor: t.text }]}
          >
            <Text variant="caption2" weight="600" color={isSel ? t.bg : t.textSecondary}>
              {tr(`weekday.short.${dayOfWeek(d)}`)}
            </Text>
            <ProgressRing
              size={32}
              stroke={3}
              progress={p}
              colors={p >= 1 ? [t.success, t.success] : undefined}
              trackColor={isSel ? (t.scheme === 'dark' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)') : t.fill}
            >
              <Text variant="footnote" weight={isToday ? '800' : '600'} color={isSel ? t.bg : future ? t.textTertiary : t.text} tabular>
                {Number(d.slice(8))}
              </Text>
            </ProgressRing>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  day: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 8, borderRadius: 18, borderCurve: 'continuous', maxWidth: 52 },
});
