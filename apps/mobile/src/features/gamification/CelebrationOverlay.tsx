import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, Keyframe, useReducedMotion } from 'react-native-reanimated';

import { Button } from '../../ui/Button';
import { Flame } from '../../ui/Flame';
import { Text } from '../../ui/Text';
import { useTheme } from '../../ui/theme';
import { motion, radius, space } from '../../ui/tokens';
import { addDays, dayOfWeek, startOfWeek } from '../habits/logic/dates';
import { useHabitStore } from '../habits/store';
import { DESTINATIONS } from './adventures';
import { Companion } from './Companion';
import { XP_PER_PERFECT_DAY } from './progression';
import { useProgress } from './useProgress';

/**
 * The delight budget lives here: this shows at most once or twice a day, right
 * after the action that earned it. Card springs in from 0.9 (never from 0);
 * under Reduce Motion it simply fades.
 */
export function CelebrationOverlay() {
  const th = useTheme();
  const { t } = useTranslation();
  const celebration = useHabitStore((s) => s.celebration);
  const companionName = useHabitStore((s) => s.companionName);
  const weekStartsOn = useHabitStore((s) => s.settings.weekStartsOn);
  const reduced = useReducedMotion();
  const p = useProgress();
  if (!celebration) return null;

  const close = () => useHabitStore.getState().dismissCelebration();
  const entering = reduced ? FadeIn.duration(200) : popIn;

  let content: React.ReactNode;
  if (celebration.kind === 'streak' || celebration.kind === 'freezeUsed') {
    const frozen = celebration.kind === 'freezeUsed';
    const start = startOfWeek(p.today, weekStartsOn);
    content = (
      <>
        <LinearGradient
          colors={frozen ? ['#64D2FF', '#0A84FF'] : ['#FFB340', '#FF6A00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <Flame size={96} frozen={frozen} />
          <Text variant="largeTitle" tone="inverse" style={styles.big} tabular>
            {celebration.streak}
          </Text>
          <Text variant="title3" tone="inverse">
            {t('streak.dayStreak', { count: celebration.streak })}
          </Text>
        </LinearGradient>
        <View style={styles.body}>
          <View style={styles.week}>
            {Array.from({ length: 7 }, (_, i) => {
              const d = addDays(start, i);
              const on = p.active.has(d);
              const ice = p.frozen.has(d);
              return (
                <View key={d} style={styles.dayCol}>
                  <Text variant="caption2" tone="secondary">
                    {t(`weekday.narrow.${dayOfWeek(d)}`)}
                  </Text>
                  <View style={[styles.dot, { backgroundColor: on ? th.flame : ice ? th.ice : th.fill }]}>
                    {on || ice ? <Ionicons name={ice ? 'snow' : 'checkmark'} size={15} color="#FFF" /> : null}
                  </View>
                </View>
              );
            })}
          </View>
          <Text variant="title3" align="center">
            {frozen ? t('celebrate.freezeTitle') : celebration.streak === 1 ? t('celebrate.firstTitle') : t('celebrate.streakTitle')}
          </Text>
          <Text variant="subhead" tone="secondary" align="center">
            {frozen
              ? t('celebrate.freezeBody', { count: celebration.days })
              : celebration.perfect
                ? t('celebrate.perfectToo', { xp: XP_PER_PERFECT_DAY })
                : t('celebrate.streakBody', { name: companionName })}
          </Text>
          {celebration.kind === 'streak' && celebration.earnedFreeze ? (
            <View style={[styles.reward, { backgroundColor: th.fill }]}>
              <Text style={{ fontSize: 18 }}>🧊</Text>
              <Text variant="subhead" weight="600">
                {t('celebrate.freezeEarned')}
              </Text>
            </View>
          ) : null}
        </View>
      </>
    );
  } else if (celebration.kind === 'adventure') {
    content = (
      <>
        <LinearGradient colors={['#40C8E0', '#7B61FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
          <Text style={{ fontSize: 56, lineHeight: 64 }}>{DESTINATIONS[celebration.destination]}</Text>
          <Companion stage={p.stage} happy size={110} />
          <Text variant="title2" tone="inverse">
            {t('adventure.celebrateTitle', { name: companionName })}
          </Text>
        </LinearGradient>
        <View style={styles.body}>
          <Text variant="title3" align="center" tabular>
            +🪙 {celebration.coins}
          </Text>
          <Text variant="subhead" tone="secondary" align="center">
            {t('adventure.celebrateBody', { place: t(`adventure.place.${celebration.destination}`) })}
          </Text>
        </View>
      </>
    );
  } else {
    content = (
      <>
        <LinearGradient colors={['#7B61FF', '#C86BFA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
          <Companion stage={p.stage} happy size={130} />
          <Text variant="title2" tone="inverse">
            {t('celebrate.perfectTitle')}
          </Text>
        </LinearGradient>
        <View style={styles.body}>
          <Text variant="subhead" tone="secondary" align="center">
            {t('celebrate.perfectBody', { name: companionName, xp: XP_PER_PERFECT_DAY })}
          </Text>
        </View>
      </>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={[StyleSheet.absoluteFill, { backgroundColor: th.overlay }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t('common.close')} />
      </Animated.View>
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View entering={entering} exiting={FadeOut.duration(150)} style={[styles.card, { backgroundColor: th.bgElevated }]}>
          {content}
          <View style={styles.cta}>
            <Button label={t('common.continue')} onPress={close} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const popIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.9 }, { translateY: 12 }] },
  100: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }], easing: motion.easeOut },
}).duration(320);

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  card: { width: '100%', maxWidth: 380, borderRadius: radius.xl + 4, borderCurve: 'continuous', overflow: 'hidden' },
  banner: { alignItems: 'center', paddingVertical: space.xxl, gap: 2 },
  big: { fontSize: 64, lineHeight: 70, fontWeight: '900' },
  body: { padding: space.xl, gap: space.md, alignItems: 'center' },
  week: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 4, flex: 1 },
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 36, borderRadius: 18 },
  cta: { paddingHorizontal: space.xl, paddingBottom: space.xl },
});
