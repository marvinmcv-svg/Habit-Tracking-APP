import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PressableScale } from '../../ui/PressableScale';
import { ProgressRing } from '../../ui/ProgressRing';
import { Text } from '../../ui/Text';
import { radius, space } from '../../ui/tokens';
import { Companion } from '../gamification/Companion';
import type { CompanionStage, LevelInfo } from '../gamification/progression';

interface Props {
  done: number;
  due: number;
  companionName: string;
  stage: CompanionStage;
  level: LevelInfo;
  isToday: boolean;
}

/** Today's progress, the companion and the level bar in one glanceable card. */
export function HeroCard({ done, due, companionName, stage, level, isToday }: Props) {
  const { t } = useTranslation();
  const progress = due === 0 ? 0 : done / due;
  const remaining = due - done;
  const message =
    due === 0
      ? t('today.hero.restDay', { name: companionName })
      : remaining === 0
        ? t('today.hero.allDone', { name: companionName })
        : done === 0
          ? t('today.hero.start', { name: companionName })
          : t('today.hero.remaining', { count: remaining });

  return (
    <PressableScale scaleTo={0.98} onPress={() => router.push('/awards')} accessibilityLabel={message}>
      <LinearGradient colors={['#7B61FF', '#A35CFF', '#C86BFA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.decor1} />
        <View style={styles.decor2} />
        <View style={styles.top}>
          <View style={styles.left}>
            <Text variant="caption" tone="inverse" style={styles.eyebrow}>
              {isToday ? t('today.hero.eyebrow') : t('today.hero.eyebrowPast')}
            </Text>
            <Text variant="title2" tone="inverse" numberOfLines={3}>
              {message}
            </Text>
            <View style={styles.ringRow}>
              <ProgressRing size={54} stroke={6} progress={progress} colors={['#FFFFFF', '#FFFFFF']} trackColor="rgba(255,255,255,0.25)">
                <Text variant="footnote" tone="inverse" weight="800" tabular>
                  {Math.round(progress * 100)}%
                </Text>
              </ProgressRing>
              <View>
                <Text variant="headline" tone="inverse" tabular>
                  {t('today.hero.count', { done, due })}
                </Text>
                <Text variant="footnote" style={styles.dim}>
                  {t('today.hero.habitsDone')}
                </Text>
              </View>
            </View>
          </View>
          <Companion stage={stage} happy={due > 0 && done > 0} size={116} />
        </View>
        <View style={styles.levelRow}>
          <Text variant="caption" tone="inverse" weight="700">
            {t('level.short', { level: level.level })}
          </Text>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.max(4, level.progress * 100)}%` }]} />
          </View>
          <Text variant="caption" style={styles.dim} tabular>
            {level.into}/{level.needed} XP
          </Text>
        </View>
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, borderCurve: 'continuous', padding: space.xl, overflow: 'hidden', gap: space.lg },
  decor1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
    right: -40,
    top: -60,
  },
  decor2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    left: -30,
    bottom: -50,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  left: { flex: 1, gap: space.sm },
  eyebrow: { opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.8 },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xs },
  dim: { color: 'rgba(255,255,255,0.75)' },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  // Absolutely positioned, childless: width is safe to change (animate-expo §4).
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4, backgroundColor: '#FFFFFF' },
});
