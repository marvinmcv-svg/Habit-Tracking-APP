import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MonthCalendar } from '../../features/habits/components/MonthCalendar';
import { useCheckIn } from '../../features/habits/components/useCheckIn';
import { amountLabel, formatTime, scheduleLabel } from '../../features/habits/format';
import { type LocalDate, today as todayDate } from '../../features/habits/logic/dates';
import { effectiveTarget, isScheduled, progressOn, valueOn } from '../../features/habits/logic/schedule';
import { habitStreak } from '../../features/habits/logic/streaks';
import { tapStep, useHabitStore } from '../../features/habits/store';
import type { Habit } from '../../features/habits/types';
import { addDays } from '../../features/habits/logic/dates';
import { confirm } from '../../lib/confirm';
import { haptics } from '../../lib/haptics';
import { cancelHabitReminders, syncHabitReminders } from '../../lib/notifications';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Flame } from '../../ui/Flame';
import { CircleButton, NavBar } from '../../ui/NavBar';
import { ProgressRing } from '../../ui/ProgressRing';
import { Screen } from '../../ui/Screen';
import { Text } from '../../ui/Text';
import { useTheme } from '../../ui/theme';
import { habitColor, radius, space, withAlpha } from '../../ui/tokens';

export default function HabitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habit = useHabitStore((s) => s.habits.find((h) => h.id === id));
  const { t } = useTranslation();
  if (!habit) {
    return (
      <View style={{ flex: 1 }}>
        <NavBar />
        <Text variant="body" tone="secondary" align="center">
          {t('habit.notFound')}
        </Text>
      </View>
    );
  }
  return <Detail habit={habit} />;
}

function Detail({ habit }: { habit: Habit }) {
  const th = useTheme();
  const { t, i18n } = useTranslation();
  const logs = useHabitStore((s) => s.logs);
  const weekStartsOn = useHabitStore((s) => s.settings.weekStartsOn);
  const today = todayDate();
  const color = habitColor(th, habit.color);
  const streak = useMemo(() => habitStreak(habit, logs, today, weekStartsOn), [habit, logs, today, weekStartsOn]);
  const { tap } = useCheckIn(habit, today);
  const value = valueOn(logs, habit.id, today);
  const target = effectiveTarget(habit);
  const progress = progressOn(habit, logs, today);
  const done = progress >= 1;
  const stepped = habit.type === 'count' || habit.type === 'duration';

  const stats = useMemo(() => {
    let due = 0;
    let completed = 0;
    for (let i = 0; i < 30; i++) {
      const d = addDays(today, -i);
      if (!isScheduled(habit, d)) continue;
      if (d === today && progressOn(habit, logs, d) < 1) continue; // today still pending
      due++;
      if (progressOn(habit, logs, d) >= 1) completed++;
    }
    const total = Object.keys(logs[habit.id] ?? {}).filter((d) => progressOn(habit, logs, d) >= 1).length;
    return { rate: due ? completed / due : 0, total };
  }, [habit, logs, today]);

  const step = (delta: number) => {
    haptics.selection();
    useHabitStore.getState().setLog(habit.id, today, Math.max(0, value + delta));
  };

  const toggleDay = (d: LocalDate) => {
    const s = useHabitStore.getState();
    const current = valueOn(s.logs, habit.id, d);
    s.setLog(habit.id, d, current >= target ? 0 : target);
  };

  const archive = () => {
    const archived = !habit.archivedAt;
    useHabitStore.getState().archiveHabit(habit.id, archived);
    if (archived) cancelHabitReminders(habit.id);
    else syncHabitReminders({ ...habit, archivedAt: null });
    haptics.light();
    if (archived) router.back();
  };

  const remove = async () => {
    const ok = await confirm(t('habit.deleteTitle'), t('habit.deleteBody', { name: habit.name }), t('common.delete'), t('common.cancel'));
    if (!ok) return;
    haptics.warning();
    cancelHabitReminders(habit.id);
    router.back();
    useHabitStore.getState().deleteHabit(habit.id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: th.bg }}>
      <NavBar
        right={
          <CircleButton
            icon="create-outline"
            label={t('common.edit')}
            onPress={() => router.push({ pathname: '/habit/edit', params: { id: habit.id } })}
          />
        }
      />
      <Screen tabs={false} contentContainerStyle={{ paddingTop: space.sm }}>
        <View style={styles.hero}>
          <View style={[styles.emojiTile, { backgroundColor: withAlpha(color, th.scheme === 'dark' ? 0.24 : 0.15) }]}>
            <Text style={styles.emoji}>{habit.emoji}</Text>
          </View>
          <Text variant="title1" align="center">
            {habit.name}
          </Text>
          <Text variant="subhead" tone="secondary" align="center">
            {[
              scheduleLabel(t, habit),
              t(`timeOfDay.${habit.timeOfDay}`),
              habit.reminderTime ? `⏰ ${formatTime(habit.reminderTime, i18n.language)}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {habit.archivedAt ? (
            <View style={[styles.archivedTag, { backgroundColor: th.fill }]}>
              <Text variant="footnote" tone="secondary" weight="600">
                {t('habit.archivedTag')}
              </Text>
            </View>
          ) : null}
        </View>

        <Card style={styles.today}>
          <ProgressRing size={96} stroke={9} progress={progress} colors={[color, color]} trackColor={withAlpha(color, 0.15)}>
            {done ? (
              <Ionicons name="checkmark" size={40} color={color} />
            ) : (
              <Text variant="title3" weight="800" tabular>
                {Math.round(progress * 100)}%
              </Text>
            )}
          </ProgressRing>
          <View style={{ flex: 1, gap: space.sm }}>
            <Text variant="caption" tone="secondary" style={styles.upper}>
              {t('habit.today')}
            </Text>
            <Text variant="headline" tabular>
              {amountLabel(t, habit, value) ?? (done ? t('habit.doneToday') : t('habit.notYet'))}
            </Text>
            {stepped ? (
              <View style={styles.stepper}>
                <CircleButton icon="remove" label={t('a11y.decrease')} onPress={() => step(-tapStep(habit))} color={color} />
                <CircleButton icon="add" label={t('a11y.increase')} onPress={() => step(tapStep(habit))} color={color} />
              </View>
            ) : null}
          </View>
        </Card>
        {!habit.archivedAt ? (
          <Button
            label={done ? t('habit.undo') : stepped ? t('habit.logStep', { step: tapStep(habit) }) : t('habit.checkIn')}
            icon={done ? 'arrow-undo' : 'checkmark'}
            color={color}
            variant={done ? 'secondary' : 'primary'}
            onPress={tap}
          />
        ) : null}

        <View style={styles.statsRow}>
          <StatCard
            icon={<Flame size={22} dim={streak.current === 0} />}
            value={String(streak.current)}
            label={streak.unit === 'week' ? t('habit.stat.currentWeeks') : t('habit.stat.current')}
          />
          <StatCard icon={<Text style={{ fontSize: 20 }}>🏆</Text>} value={String(streak.longest)} label={t('habit.stat.best')} />
          <StatCard
            icon={<Text style={{ fontSize: 20 }}>📈</Text>}
            value={`${Math.round(stats.rate * 100)}%`}
            label={t('habit.stat.rate')}
          />
          <StatCard icon={<Text style={{ fontSize: 20 }}>✅</Text>} value={String(stats.total)} label={t('habit.stat.total')} />
        </View>

        <Card>
          <MonthCalendar
            today={today}
            color={color}
            weekStartsOn={weekStartsOn}
            minDate={habit.startDate}
            progressFor={(d) => (isScheduled(habit, d) || valueOn(logs, habit.id, d) > 0 ? progressOn(habit, logs, d) : null)}
            onToggle={toggleDay}
          />
        </Card>
        <Text variant="footnote" tone="secondary" align="center">
          {t('habit.calendarHint')}
        </Text>

        <View style={styles.actions}>
          <Button
            label={habit.archivedAt ? t('habit.unarchive') : t('habit.archive')}
            icon="archive-outline"
            variant="secondary"
            size="md"
            onPress={archive}
            style={{ flex: 1 }}
          />
          <Button
            label={t('common.delete')}
            icon="trash-outline"
            variant="secondary"
            color={th.danger}
            size="md"
            onPress={remove}
            style={{ flex: 1 }}
          />
        </View>
      </Screen>
    </View>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <Card style={styles.stat}>
      {icon}
      <Text variant="title3" weight="800" tabular>
        {value}
      </Text>
      <Text variant="caption" tone="secondary" align="center" numberOfLines={2}>
        {label}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm },
  emojiTile: {
    width: 88,
    height: 88,
    borderRadius: 28,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  emoji: { fontSize: 46, lineHeight: 56 },
  archivedTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  today: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  upper: { textTransform: 'uppercase', letterSpacing: 0.6 },
  stepper: { flexDirection: 'row', gap: space.sm },
  statsRow: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: space.md },
  actions: { flexDirection: 'row', gap: space.sm },
});
