import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { haptics } from '../../lib/haptics';
import { scheduleAdventureReturn } from '../../lib/notifications';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Text } from '../../ui/Text';
import { useTheme } from '../../ui/theme';
import { space } from '../../ui/tokens';
import { useHabitStore } from '../habits/store';
import { ADVENTURE_HOURS, DESTINATIONS, adventureReward, adventureStatus, formatRemaining } from './adventures';
import type { CompanionStage } from './progression';

/** Re-render on a slow clock: minutes are the finest unit shown. */
function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** 8-hour adventures: earn by showing up today, collect when Pip returns. */
export function AdventureCard({ stage, todayDone }: { stage: CompanionStage; todayDone: boolean }) {
  const th = useTheme();
  const { t } = useTranslation();
  const adventure = useHabitStore((s) => s.adventure);
  const name = useHabitStore((s) => s.companionName);
  const now = useNow();
  const status = adventureStatus(adventure, now);

  if (status.kind === 'away' && adventure) {
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.big}>{DESTINATIONS[adventure.destination]}</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="headline">{t('adventure.awayTitle', { name, place: t(`adventure.place.${adventure.destination}`) })}</Text>
            <Text variant="subhead" tone="secondary" tabular>
              {t('adventure.back', { time: formatRemaining(status.remainingMs) })}
            </Text>
          </View>
        </View>
        <View
          style={[styles.track, { backgroundColor: th.fill }]}
          accessibilityRole="progressbar"
          accessibilityValue={{ now: Math.round(status.progress * 100), min: 0, max: 100 }}
        >
          <View style={[styles.fill, { width: `${Math.max(3, status.progress * 100)}%`, backgroundColor: th.accent }]} />
        </View>
      </Card>
    );
  }

  if (status.kind === 'ready' && adventure) {
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.big}>🎁</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="headline">{t('adventure.readyTitle', { name })}</Text>
            <Text variant="subhead" tone="secondary">
              {t('adventure.readyBody', { coins: adventure.reward.coins })}
            </Text>
          </View>
        </View>
        <Button
          label={t('adventure.claim', { coins: adventure.reward.coins })}
          icon="gift"
          size="md"
          onPress={() => {
            if (useHabitStore.getState().claimAdventure()) haptics.success();
          }}
        />
      </Card>
    );
  }

  const reward = adventureReward(stage).coins;
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.big}>🧭</Text>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline">{t('adventure.idleTitle', { name })}</Text>
          <Text variant="subhead" tone="secondary">
            {todayDone ? t('adventure.idleBody', { hours: ADVENTURE_HOURS, coins: reward }) : t('adventure.locked')}
          </Text>
        </View>
      </View>
      <Button
        label={t('adventure.start')}
        icon="compass"
        size="md"
        variant={todayDone ? 'primary' : 'secondary'}
        disabled={!todayDone}
        onPress={() => {
          const adv = useHabitStore.getState().startAdventure();
          if (adv) {
            haptics.success();
            scheduleAdventureReturn(new Date(adv.endsAt), name);
          }
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  big: { fontSize: 36, lineHeight: 44 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
});
