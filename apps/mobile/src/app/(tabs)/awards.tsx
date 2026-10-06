import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { MAX_FREEZES, FREEZE_PRICE, STAGE_LEVELS } from '../../features/gamification/progression';
import { Companion } from '../../features/gamification/Companion';
import { useProgress } from '../../features/gamification/useProgress';
import { useHabitStore } from '../../features/habits/store';
import { haptics } from '../../lib/haptics';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Screen, ScreenHeader, SectionTitle } from '../../ui/Screen';
import { Text } from '../../ui/Text';
import { useTheme } from '../../ui/theme';
import { radius, space } from '../../ui/tokens';

export default function AwardsScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const p = useProgress();
  const companionName = useHabitStore((s) => s.companionName);
  const nextStageLevel = STAGE_LEVELS[p.stage + 1];

  const records = [
    { key: 'longestStreak', value: p.streak.longest, emoji: '🔥', colors: ['#FF9F0A', '#FF453A'] as [string, string] },
    { key: 'totalXp', value: p.xp, emoji: '⚡', colors: ['#FFD60A', '#FF9F0A'] as [string, string] },
    { key: 'perfectDays', value: p.totals.perfectDays, emoji: '💎', colors: ['#64D2FF', '#5E5CE6'] as [string, string] },
    { key: 'checkins', value: p.totals.checkins, emoji: '✅', colors: ['#30D158', '#00A86B'] as [string, string] },
  ];

  return (
    <Screen>
      <ScreenHeader title={tr('awards.title')} />

      <Card style={styles.companion}>
        <Companion stage={p.stage} happy={p.streak.todayDone} size={110} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text variant="caption" tone="secondary" style={styles.upper}>
            {tr(`companion.stage.${p.stage}`)}
          </Text>
          <Text variant="title2">{companionName}</Text>
          <Text variant="subhead" tone="secondary">
            {nextStageLevel
              ? tr('companion.nextStage', { level: nextStageLevel, stage: tr(`companion.stage.${p.stage + 1}`) })
              : tr('companion.maxStage')}
          </Text>
          <View style={styles.levelRow}>
            <Text variant="footnote" weight="700" tone="accent">
              {tr('level.short', { level: p.level.level })}
            </Text>
            <View style={[styles.bar, { backgroundColor: t.fill }]}>
              <View style={[styles.barFill, { width: `${Math.max(4, p.level.progress * 100)}%`, backgroundColor: t.accent }]} />
            </View>
          </View>
        </View>
      </Card>

      <SectionTitle>{tr('awards.records')}</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.records} style={styles.recordsScroll}>
        {records.map((r) => (
          <View key={r.key} style={[styles.record, { backgroundColor: t.card, borderColor: t.separator }]}>
            <Badge emoji={r.emoji} colors={r.colors} value={r.value} locked={r.value === 0} size={76} />
            <Text variant="footnote" weight="700" align="center" numberOfLines={2}>
              {tr(`awards.record.${r.key}`)}
            </Text>
          </View>
        ))}
      </ScrollView>

      <SectionTitle>{tr('awards.freezes.title')}</SectionTitle>
      <Card style={styles.freeze}>
        <View style={styles.freezeTop}>
          <Text style={{ fontSize: 40 }}>🧊</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="headline">{tr('awards.freezes.owned', { count: p.freezes, max: MAX_FREEZES })}</Text>
            <Text variant="footnote" tone="secondary">
              {tr('awards.freezes.body')}
            </Text>
          </View>
        </View>
        <View style={styles.freezeBottom}>
          <Text variant="subhead" weight="600" tabular>
            🪙 {p.coins}
          </Text>
          <Button
            label={p.freezes >= MAX_FREEZES ? tr('awards.freezes.full') : tr('awards.freezes.buy', { price: FREEZE_PRICE })}
            size="md"
            icon="snow"
            color={t.ice}
            disabled={p.freezes >= MAX_FREEZES || p.coins < FREEZE_PRICE}
            onPress={() => {
              if (useHabitStore.getState().buyFreeze()) haptics.success();
            }}
          />
        </View>
      </Card>

      <SectionTitle>{tr('awards.badges')}</SectionTitle>
      <View style={styles.grid}>
        {p.achievements.map((a) => (
          <View
            key={a.def.key}
            style={styles.badgeCell}
            accessible
            accessibilityLabel={`${tr(`achievement.${a.def.key}.name`)}, ${tr('awards.tierOf', { tier: a.tier, total: a.def.tiers.length })}`}
          >
            <Badge emoji={a.def.emoji} colors={a.def.colors} value={a.shownValue} locked={a.tier === 0} size={88} />
            <Text variant="footnote" weight="700" align="center" numberOfLines={1} tone={a.tier === 0 ? 'tertiary' : 'primary'}>
              {tr(`achievement.${a.def.key}.name`)}
            </Text>
            <Text variant="caption" tone="secondary" align="center">
              {a.tier === 0
                ? tr(`achievement.${a.def.key}.hint`, { count: a.def.tiers[0] })
                : tr('awards.tierOf', { tier: a.tier, total: a.def.tiers.length })}
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  upper: { textTransform: 'uppercase', letterSpacing: 0.6 },
  companion: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 4 },
  bar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  recordsScroll: { marginHorizontal: -space.lg },
  records: { paddingHorizontal: space.lg, gap: space.md, paddingVertical: 4 },
  record: {
    width: 128,
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1.5,
  },
  freeze: { gap: space.lg },
  freezeTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  freezeBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.xl },
  badgeCell: { width: '33.33%', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
});
