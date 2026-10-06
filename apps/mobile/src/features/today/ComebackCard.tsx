import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn } from 'react-native-reanimated';

import { haptics } from '../../lib/haptics';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Text } from '../../ui/Text';
import { space } from '../../ui/tokens';
import { Companion } from '../gamification/Companion';
import type { CompanionStage } from '../gamification/progression';
import { REPAIR_MAX_DAYS, REPAIR_PRICE, type Comeback, useHabitStore } from '../habits/store';

/**
 * Shown once after a streak breaks. Warm, never shaming: offer a repair when
 * it's cheap and recent, otherwise a fresh start framed as progress.
 */
export function ComebackCard({
  comeback,
  coins,
  stage,
  companionName,
}: {
  comeback: Comeback;
  coins: number;
  stage: CompanionStage;
  companionName: string;
}) {
  const { t } = useTranslation();
  const canRepair = comeback.missedDays <= REPAIR_MAX_DAYS;
  const affordable = coins >= REPAIR_PRICE;
  return (
    <Animated.View entering={FadeIn.duration(260)}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <Companion stage={stage} happy={false} size={72} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="headline">{t('comeback.title', { name: companionName })}</Text>
            <Text variant="subhead" tone="secondary">
              {t('comeback.body', { count: comeback.lostStreak })}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          {canRepair ? (
            <Button
              label={t('comeback.repair', { price: REPAIR_PRICE })}
              icon="bandage-outline"
              size="md"
              variant="secondary"
              disabled={!affordable}
              onPress={() => {
                if (useHabitStore.getState().repairStreak()) haptics.success();
              }}
              style={{ flex: 1 }}
            />
          ) : null}
          <Button
            label={t('comeback.fresh')}
            icon="leaf-outline"
            size="md"
            onPress={() => {
              haptics.light();
              useHabitStore.getState().startFresh();
            }}
            style={{ flex: 1 }}
          />
        </View>
        {canRepair && !affordable ? (
          <Text variant="footnote" tone="secondary" align="center">
            {t('comeback.notEnough', { price: REPAIR_PRICE })}
          </Text>
        ) : null}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  actions: { flexDirection: 'row', gap: space.sm },
});
