import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { HabitCard } from '../../features/habits/components/HabitCard';
import { today as todayDate } from '../../features/habits/logic/dates';
import { isDone, isScheduled } from '../../features/habits/logic/schedule';
import { completionRate } from '../../features/habits/logic/stats';
import { habitStreak } from '../../features/habits/logic/streaks';
import { useHabitStore } from '../../features/habits/store';
import { openNewHabit } from '../../features/paywall/entitlement';
import { Card } from '../../ui/Card';
import { PressableScale } from '../../ui/PressableScale';
import { Screen, ScreenHeader, SectionTitle } from '../../ui/Screen';
import { Text } from '../../ui/Text';
import { useTheme } from '../../ui/theme';
import { radius, space } from '../../ui/tokens';

export default function HabitsScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const weekStartsOn = useHabitStore((s) => s.settings.weekStartsOn);
  const [showArchived, setShowArchived] = useState(false);
  const today = todayDate();

  const active = useMemo(() => habits.filter((h) => !h.archivedAt).sort((a, b) => a.order - b.order), [habits]);
  const archived = useMemo(() => habits.filter((h) => h.archivedAt), [habits]);
  const doneToday = active.filter((h) => isScheduled(h, today) && isDone(h, logs, today)).length;
  const week = completionRate(active, logs, today, 7);

  return (
    <Screen>
      <ScreenHeader title={tr('habits.title')} />
      <Card style={styles.summary}>
        <Text variant="subhead" tone="secondary">
          {tr('habits.subtitle')}
        </Text>
        <View style={styles.stats}>
          <Stat value={String(active.length)} label={tr('habits.total')} color={t.accent} />
          <Stat value={String(doneToday)} label={tr('habits.completedToday')} color={t.success} />
          <Stat value={`${Math.round(week.rate * 100)}%`} label={tr('habits.thisWeek')} color={t.flame} />
        </View>
        <PressableScale
          onPress={() => router.push('/insights')}
          accessibilityLabel={tr('insights.title')}
          style={[styles.insights, { backgroundColor: t.fill }]}
        >
          <Ionicons name="bar-chart" size={16} color={t.accent} />
          <Text variant="subhead" weight="600" tone="accent" style={{ flex: 1 }}>
            {tr('insights.open')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={t.textTertiary} />
        </PressableScale>
      </Card>

      <PressableScale onPress={openNewHabit} accessibilityLabel={tr('habits.create')}>
        <Card style={styles.create} padded={false}>
          <View style={[styles.plus, { backgroundColor: t.accent }]}>
            <Ionicons name="add" size={20} color="#FFF" />
          </View>
          <Text variant="headline" style={{ flex: 1 }}>
            {tr('habits.create')}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={t.textTertiary} />
        </Card>
      </PressableScale>

      {active.map((h) => (
        <HabitCard
          key={h.id}
          habit={h}
          logs={logs}
          today={today}
          streak={habitStreak(h, logs, today, weekStartsOn)}
          weekStartsOn={weekStartsOn}
        />
      ))}

      {archived.length > 0 ? (
        <>
          <SectionTitle
            right={
              <PressableScale onPress={() => setShowArchived((v) => !v)} accessibilityLabel={tr('habits.archived')}>
                <Text variant="subhead" tone="accent" weight="600">
                  {showArchived ? tr('common.hide') : tr('common.show')}
                </Text>
              </PressableScale>
            }
          >
            {`${tr('habits.archived')} · ${archived.length}`}
          </SectionTitle>
          {showArchived
            ? archived.map((h) => (
                <PressableScale
                  key={h.id}
                  onPress={() => router.push({ pathname: '/habit/[id]', params: { id: h.id } })}
                  accessibilityLabel={h.name}
                >
                  <Card style={styles.archivedRow} padded={false}>
                    <Text style={{ fontSize: 20 }}>{h.emoji}</Text>
                    <Text variant="body" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>
                      {h.name}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={t.textTertiary} />
                  </Card>
                </PressableScale>
              ))
            : null}
        </>
      ) : null}
    </Screen>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="title1" color={color} weight="800" tabular>
        {value}
      </Text>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { gap: space.md },
  insights: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, height: 40, borderRadius: radius.md },
  stats: { flexDirection: 'row', gap: space.md },
  create: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  plus: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  archivedRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg },
});
