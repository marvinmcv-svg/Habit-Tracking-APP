import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { StatPill } from '../../features/habits/components/CheckButton';
import { HabitRow } from '../../features/habits/components/HabitRow';
import { formatDate } from '../../features/habits/format';
import { type LocalDate } from '../../features/habits/logic/dates';
import { dueHabits, progressOn, valueOn } from '../../features/habits/logic/schedule';
import { habitStreak } from '../../features/habits/logic/streaks';
import { useHabitStore } from '../../features/habits/store';
import type { Habit, TimeOfDay } from '../../features/habits/types';
import { Companion } from '../../features/gamification/Companion';
import { useProgress } from '../../features/gamification/useProgress';
import { AdventureCard } from '../../features/gamification/AdventureCard';
import { openNewHabit } from '../../features/paywall/entitlement';
import { ComebackCard } from '../../features/today/ComebackCard';
import { HeroCard } from '../../features/today/HeroCard';
import { StreakCard } from '../../features/today/StreakCard';
import { WeekStrip } from '../../features/today/WeekStrip';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Flame } from '../../ui/Flame';
import { PressableScale } from '../../ui/PressableScale';
import { Screen, ScreenHeader, SectionTitle } from '../../ui/Screen';
import { Text } from '../../ui/Text';
import { space } from '../../ui/tokens';

const GROUPS: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'anytime'];

function greetingKey(): string {
  const h = new Date().getHours();
  if (h < 5) return 'today.greeting.night';
  if (h < 12) return 'today.greeting.morning';
  if (h < 18) return 'today.greeting.afternoon';
  return 'today.greeting.evening';
}

export default function TodayScreen() {
  const { t, i18n } = useTranslation();
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const weekStartsOn = useHabitStore((s) => s.settings.weekStartsOn);
  const companionName = useHabitStore((s) => s.companionName);
  const comeback = useHabitStore((s) => s.comeback);
  const adventure = useHabitStore((s) => s.adventure);
  const progress = useProgress();
  const { today } = progress;
  const [selected, setSelected] = useState<LocalDate>(today);
  const date = selected > today ? today : selected;

  const due = useMemo(() => dueHabits(habits, date), [habits, date]);
  const doneCount = due.filter((h) => progressOn(h, logs, date) >= 1).length;
  const groups = useMemo(() => {
    const map = new Map<TimeOfDay, Habit[]>();
    for (const h of due) map.set(h.timeOfDay, [...(map.get(h.timeOfDay) ?? []), h]);
    return GROUPS.filter((g) => map.has(g)).map((g) => ({ key: g, habits: map.get(g)! }));
  }, [due]);
  const streaks = useMemo(
    () => Object.fromEntries(habits.map((h) => [h.id, habitStreak(h, logs, today, weekStartsOn)])),
    [habits, logs, today, weekStartsOn],
  );

  const dayProgress = (d: LocalDate) => {
    const list = dueHabits(habits, d);
    if (list.length === 0) return 0;
    return list.reduce((sum, h) => sum + progressOn(h, logs, d), 0) / list.length;
  };

  const activeHabits = habits.filter((h) => !h.archivedAt);

  return (
    <Screen>
      <ScreenHeader
        eyebrow={formatDate(today, i18n.language, { weekday: 'long', month: 'long', day: 'numeric' })}
        title={t(greetingKey())}
        right={
          <View style={styles.pills}>
            <StatPill icon={<Text style={{ fontSize: 14 }}>🪙</Text>} text={String(progress.coins)} />
            <PressableScale
              onPress={() => router.push('/awards')}
              accessibilityLabel={t('streak.days', { count: progress.streak.current })}
            >
              <StatPill icon={<Flame size={16} dim={progress.streak.current === 0} />} text={String(progress.streak.current)} />
            </PressableScale>
          </View>
        }
      />

      <WeekStrip today={today} selected={date} weekStartsOn={weekStartsOn} progressFor={dayProgress} onSelect={setSelected} />

      {comeback ? <ComebackCard comeback={comeback} coins={progress.coins} stage={progress.stage} companionName={companionName} /> : null}

      <HeroCard
        done={doneCount}
        due={due.length}
        companionName={companionName}
        stage={progress.stage}
        level={progress.level}
        isToday={date === today}
      />

      {adventure ? <AdventureCard stage={progress.stage} todayDone={progress.streak.todayDone} /> : null}

      {date !== today ? (
        <PressableScale onPress={() => setSelected(today)} accessibilityLabel={t('today.backToToday')}>
          <Card style={styles.pastBanner} padded={false}>
            <Text variant="subhead" tone="secondary" style={{ flex: 1 }}>
              {t('today.editingPast', { date: formatDate(date, i18n.language, { weekday: 'long', day: 'numeric', month: 'short' }) })}
            </Text>
            <Text variant="subhead" tone="accent" weight="600">
              {t('today.backToToday')}
            </Text>
          </Card>
        </PressableScale>
      ) : null}

      {activeHabits.length === 0 ? (
        <EmptyState stage={progress.stage} name={companionName} />
      ) : due.length === 0 ? (
        <Card style={styles.rest}>
          <Text style={{ fontSize: 40 }}>🌤️</Text>
          <Text variant="headline" align="center">
            {t('today.nothingDue')}
          </Text>
          <Text variant="subhead" tone="secondary" align="center">
            {t('today.nothingDueBody')}
          </Text>
        </Card>
      ) : (
        groups.map((g) => (
          <View key={g.key} style={styles.group}>
            <SectionTitle>{t(`timeOfDay.${g.key}`)}</SectionTitle>
            {g.habits.map((h) => (
              <HabitRow
                key={h.id}
                habit={h}
                date={date}
                value={valueOn(logs, h.id, date)}
                progress={progressOn(h, logs, date)}
                streak={streaks[h.id]}
              />
            ))}
          </View>
        ))
      )}

      <SectionTitle>{t('streak.title')}</SectionTitle>
      <StreakCard
        streak={progress.streak.current}
        todayDone={progress.streak.todayDone}
        today={today}
        active={progress.active}
        frozen={progress.frozen}
        freezes={progress.freezes}
        weekStartsOn={weekStartsOn}
      />
    </Screen>
  );
}

function EmptyState({ stage, name }: { stage: 0 | 1 | 2 | 3 | 4; name: string }) {
  const { t } = useTranslation();
  return (
    <Card style={styles.empty}>
      <Companion stage={stage} happy size={96} />
      <Text variant="title3" align="center">
        {t('today.empty.title', { name })}
      </Text>
      <Text variant="subhead" tone="secondary" align="center">
        {t('today.empty.body')}
      </Text>
      <Button label={t('habits.create')} icon="add" onPress={openNewHabit} style={{ alignSelf: 'stretch' }} />
    </Card>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', gap: 6 },
  group: { gap: space.sm + 2 },
  pastBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm },
  rest: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
});
