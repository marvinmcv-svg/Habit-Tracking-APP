import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Flame } from '../../ui/Flame';
import { Text } from '../../ui/Text';
import { useTheme } from '../../ui/theme';
import { radius, space } from '../../ui/tokens';
import { type LocalDate, addDays, dayOfWeek, startOfWeek } from '../habits/logic/dates';

interface Props {
  streak: number;
  todayDone: boolean;
  today: LocalDate;
  active: ReadonlySet<LocalDate>;
  frozen: ReadonlySet<LocalDate>;
  freezes: number;
  weekStartsOn: 0 | 1;
}

type DayState = 'done' | 'frozen' | 'today' | 'missed' | 'future';

/**
 * Duolingo-style streak card. Lights up orange once today is secured, so the
 * state is readable from colour, icon *and* copy (never colour alone).
 */
export function StreakCard({ streak, todayDone, today, active, frozen, freezes, weekStartsOn }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const lit = todayDone && streak > 0;
  const start = startOfWeek(today, weekStartsOn);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    const state: DayState = active.has(d) ? 'done' : frozen.has(d) ? 'frozen' : d === today ? 'today' : d > today ? 'future' : 'missed';
    return { d, state };
  });

  const fg = lit ? '#FFFFFF' : t.text;
  const sub = lit ? 'rgba(255,255,255,0.85)' : t.textSecondary;
  const subtitle = lit ? tr('streak.securedToday') : streak > 0 ? tr('streak.keepGoing') : tr('streak.startOne');

  const body = (
    <>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Flame size={30} dim={!lit && streak === 0} />
            <Text variant="title1" color={fg} tabular weight="800">
              {tr('streak.days', { count: streak })}
            </Text>
          </View>
          <Text variant="subhead" color={sub}>
            {subtitle}
          </Text>
        </View>
        <View
          style={[styles.freeze, { backgroundColor: lit ? 'rgba(255,255,255,0.22)' : t.fill }]}
          accessibilityLabel={tr('streak.freezesA11y', { count: freezes })}
        >
          <Text style={styles.freezeIcon}>🧊</Text>
          <Text variant="subhead" weight="700" color={fg} tabular>
            {freezes}
          </Text>
        </View>
      </View>
      <View style={styles.week}>
        {days.map(({ d, state }) => (
          <View key={d} style={styles.dayCol}>
            <Text variant="caption2" color={sub}>
              {tr(`weekday.narrow.${dayOfWeek(d)}`)}
            </Text>
            <DayDot state={state} lit={lit} />
          </View>
        ))}
      </View>
    </>
  );

  if (lit) {
    return (
      <LinearGradient colors={['#FFB340', '#FF7A1A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        {body}
      </LinearGradient>
    );
  }
  return <View style={[styles.card, { backgroundColor: t.card }]}>{body}</View>;
}

function DayDot({ state, lit }: { state: DayState; lit: boolean }) {
  const t = useTheme();
  if (state === 'done') {
    return (
      <View style={[styles.dot, { backgroundColor: lit ? '#FFFFFF' : t.flame }]}>
        <Ionicons name="checkmark" size={16} color={lit ? '#FF7A1A' : '#FFFFFF'} />
      </View>
    );
  }
  if (state === 'frozen') {
    return (
      <View style={[styles.dot, { backgroundColor: t.ice }]}>
        <Ionicons name="snow" size={14} color="#FFFFFF" />
      </View>
    );
  }
  if (state === 'today') {
    return <View style={[styles.dot, { borderWidth: 2, borderColor: lit ? '#FFFFFF' : t.flame, borderStyle: 'dashed' }]} />;
  }
  return <View style={[styles.dot, { backgroundColor: lit ? 'rgba(255,255,255,0.25)' : t.fill, opacity: state === 'future' ? 0.5 : 1 }]} />;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, borderCurve: 'continuous', padding: space.xl, gap: space.lg, overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  freeze: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 32, borderRadius: 16 },
  freezeIcon: { fontSize: 15 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 6, flex: 1 },
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
