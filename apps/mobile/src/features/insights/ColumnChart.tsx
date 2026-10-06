import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '../../ui/Text';
import { useTheme } from '../../ui/theme';
import { formatDate } from '../habits/format';
import type { LocalDate } from '../habits/logic/dates';

export interface Point {
  date: LocalDate;
  rate: number;
  done: number;
  due: number;
}

const HEIGHT = 140;
const TICKS = [0, 0.5, 1];

/**
 * Daily completion columns. Single series, so no legend — the card title names it.
 * Columns cap at 24px with a 4px rounded data-end; tap a column for its tooltip.
 */
export function ColumnChart({ points }: { points: Point[] }) {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const [sel, setSel] = useState<number | null>(null);
  const selected = sel !== null ? points[sel] : null;
  const dense = points.length > 14;

  return (
    <View>
      <View style={styles.tooltipRow}>
        {selected ? (
          <View style={[styles.tooltip, { backgroundColor: t.fill }]}>
            <Text variant="footnote" weight="600">
              {formatDate(selected.date, i18n.language, { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            <Text variant="footnote" tone="secondary" tabular>
              {selected.due === 0
                ? tr('insights.nothingDue')
                : tr('insights.tooltip', { done: selected.done, due: selected.due, pct: Math.round(selected.rate * 100) })}
            </Text>
          </View>
        ) : (
          <Text variant="footnote" tone="tertiary">
            {tr('insights.tapHint')}
          </Text>
        )}
      </View>
      <View style={styles.plot}>
        <View style={styles.axis}>
          {[...TICKS].reverse().map((v) => (
            <Text key={v} variant="caption2" tone="tertiary" tabular style={styles.tick}>
              {Math.round(v * 100)}%
            </Text>
          ))}
        </View>
        <View style={{ flex: 1, height: HEIGHT }}>
          {TICKS.map((v) => (
            <View key={v} style={[styles.grid, { bottom: v * HEIGHT, backgroundColor: v === 0 ? t.separator : t.fill }]} />
          ))}
          <View style={[styles.columns, { gap: dense ? 2 : 4 }]}>
            {points.map((p, i) => {
              const active = sel === i;
              return (
                <Pressable
                  key={p.date}
                  style={styles.slot}
                  onPress={() => setSel(active ? null : i)}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatDate(p.date, i18n.language, { weekday: 'long', month: 'long', day: 'numeric' })}: ${Math.round(p.rate * 100)}%`}
                >
                  <View
                    style={[
                      styles.col,
                      {
                        height: Math.max(p.due ? 3 : 0, p.rate * HEIGHT),
                        backgroundColor: t.accent,
                        opacity: sel === null || active ? 1 : 0.35,
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
      <View style={[styles.xLabels, { marginLeft: 36 }]}>
        <Text variant="caption2" tone="tertiary">
          {formatDate(points[0].date, i18n.language, { month: 'short', day: 'numeric' })}
        </Text>
        <Text variant="caption2" tone="tertiary">
          {tr('habit.today')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltipRow: { height: 48, justifyContent: 'center' },
  tooltip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  plot: { flexDirection: 'row' },
  axis: { width: 36, height: HEIGHT, justifyContent: 'space-between' },
  tick: { marginTop: -6, marginBottom: -6 },
  grid: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  columns: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end' },
  slot: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  col: { width: '100%', maxWidth: 24, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
});
