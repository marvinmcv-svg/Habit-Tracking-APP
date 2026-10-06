import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { addDays, dayOfWeek, today as todayDate } from '../features/habits/logic/dates';
import { isDone, isScheduled } from '../features/habits/logic/schedule';
import { completionRate, dailySeries } from '../features/habits/logic/stats';
import { useHabitStore } from '../features/habits/store';
import { ColumnChart } from '../features/insights/ColumnChart';
import { HBar } from '../features/insights/HBar';
import { openPaywall, useEntitlement } from '../features/paywall/entitlement';
import { Card } from '../ui/Card';
import { NavBar } from '../ui/NavBar';
import { PressableScale } from '../ui/PressableScale';
import { Screen, SectionTitle } from '../ui/Screen';
import { Segmented } from '../ui/Segmented';
import { Text } from '../ui/Text';
import { useTheme } from '../ui/theme';
import { habitColor, space } from '../ui/tokens';

type Range = '7' | '30' | '90';

export default function InsightsScreen() {
  const th = useTheme();
  const { t, i18n } = useTranslation();
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const weekStartsOn = useHabitStore((s) => s.settings.weekStartsOn);
  const { unlocked } = useEntitlement();
  const [range, setRange] = useState<Range>('7');
  const days = Number(range);
  const today = todayDate();
  const active = useMemo(() => habits.filter((h) => !h.archivedAt), [habits]);

  const data = useMemo(() => {
    // Today is still in progress: its unfinished check-ins aren't misses yet.
    const series = dailySeries(active, logs, today, days).map((p) =>
      p.date === today ? { ...p, due: p.done, rate: p.done > 0 ? 1 : 0 } : p,
    );
    const doneSum = series.reduce((n, p) => n + p.done, 0);
    const dueSum = series.reduce((n, p) => n + p.due, 0);
    const current = { done: doneSum, due: dueSum, rate: dueSum ? doneSum / dueSum : 0 };
    const previous = completionRate(active, logs, addDays(today, -days), days);
    const perHabit = active
      .map((h) => {
        let due = 0;
        let done = 0;
        for (let i = 0; i < days; i++) {
          const d = addDays(today, -i);
          if (!isScheduled(h, d)) continue;
          if (d === today && !isDone(h, logs, d)) continue;
          due++;
          if (isDone(h, logs, d)) done++;
        }
        return { habit: h, rate: due ? done / due : 0, due };
      })
      .filter((x) => x.due > 0)
      .sort((a, b) => b.rate - a.rate);
    const byWeekday = Array.from({ length: 7 }, () => ({ due: 0, done: 0 }));
    for (const p of series) {
      const w = byWeekday[dayOfWeek(p.date)];
      w.due += p.due;
      w.done += p.done;
    }
    // 90 days of daily columns would be ~2px wide on a phone — bucket into weeks instead.
    const chart =
      days <= 30
        ? series
        : Array.from({ length: Math.ceil(series.length / 7) }, (_, i) => {
            const slice = series.slice(i * 7, i * 7 + 7);
            const done = slice.reduce((n, p) => n + p.done, 0);
            const due = slice.reduce((n, p) => n + p.due, 0);
            return { date: slice[0].date, done, due, rate: due ? done / due : 0 };
          });
    return { current, previous, series, chart, perHabit, byWeekday };
  }, [active, logs, today, days]);

  const delta = Math.round((data.current.rate - data.previous.rate) * 100);
  const order = weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  const best = order.reduce(
    (b, d) => {
      const w = data.byWeekday[d];
      const r = w.due ? w.done / w.due : -1;
      return r > b.r ? { d, r } : b;
    },
    { d: -1, r: -1 },
  );

  return (
    <View style={{ flex: 1, backgroundColor: th.bg }}>
      <NavBar title={t('insights.title')} />
      <Screen tabs={false} contentContainerStyle={{ paddingTop: space.sm }}>
        <Segmented<Range>
          value={range}
          onChange={(r) => {
            if (r === '90' && !unlocked) {
              openPaywall('insights');
              return;
            }
            setRange(r);
          }}
          options={[
            { value: '7', label: t('insights.range.7') },
            { value: '30', label: t('insights.range.30') },
            { value: '90', label: unlocked ? t('insights.range.90') : `${t('insights.range.90')} · Pro` },
          ]}
        />

        <Card style={styles.hero}>
          <Text variant="caption" tone="secondary" style={styles.upper}>
            {t('insights.completion')}
          </Text>
          <View style={styles.heroRow}>
            <Text variant="largeTitle" style={{ fontSize: 48, lineHeight: 54 }} tabular>
              {Math.round(data.current.rate * 100)}%
            </Text>
            {data.previous.due > 0 ? (
              <View style={[styles.delta, { backgroundColor: th.fill }]}>
                <Ionicons name={delta >= 0 ? 'arrow-up' : 'arrow-down'} size={14} color={th.text} />
                <Text variant="footnote" weight="600" tabular>
                  {t('insights.vsPrevious', { delta: Math.abs(delta) })}
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="subhead" tone="secondary" tabular>
            {t('insights.doneOfDue', { done: data.current.done, due: data.current.due })}
          </Text>
        </Card>

        <Card>
          <Text variant="headline">{days <= 30 ? t('insights.daily') : t('insights.weekly')}</Text>
          <ColumnChart points={data.chart} />
        </Card>

        <SectionTitle>{t('insights.byHabit')}</SectionTitle>
        <Card style={{ gap: space.lg }}>
          {data.perHabit.length === 0 ? (
            <Text variant="subhead" tone="secondary">
              {t('insights.empty')}
            </Text>
          ) : (
            data.perHabit.map(({ habit, rate }) => (
              <HBar
                key={habit.id}
                label={habit.name}
                value={rate}
                color={habitColor(th, habit.color)}
                leading={<Text style={{ fontSize: 16 }}>{habit.emoji}</Text>}
              />
            ))
          )}
        </Card>

        <SectionTitle>{t('insights.byWeekday')}</SectionTitle>
        <Card style={{ gap: space.md }}>
          {best.d >= 0 ? (
            <Text variant="subhead" tone="secondary">
              {t('insights.bestDay', {
                day: i18n.language.startsWith('es') ? t(`weekday.long.${best.d}`).toLowerCase() : t(`weekday.long.${best.d}`),
              })}
            </Text>
          ) : null}
          {order.map((d) => {
            const w = data.byWeekday[d];
            return <HBar key={d} label={t(`weekday.long.${d}`)} value={w.due ? w.done / w.due : 0} color={th.accent} />;
          })}
        </Card>

        {!unlocked ? (
          <PressableScale onPress={() => openPaywall('insights')} accessibilityLabel={t('insights.proCta')}>
            <Card style={styles.pro}>
              <Ionicons name="sparkles" size={20} color={th.accent} />
              <Text variant="subhead" weight="600" style={{ flex: 1 }}>
                {t('insights.proCta')}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={th.textTertiary} />
            </Card>
          </PressableScale>
        ) : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 4 },
  upper: { textTransform: 'uppercase', letterSpacing: 0.6 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, height: 26, borderRadius: 13 },
  pro: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
