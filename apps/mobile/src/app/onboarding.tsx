import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Companion } from '../features/gamification/Companion';
import { useHabitStore } from '../features/habits/store';
import { TEMPLATES } from '../features/habits/templates';
import { openPaywall } from '../features/paywall/entitlement';
import { purchasesAvailable } from '../lib/purchases';
import { track } from '../lib/analytics';
import { haptics } from '../lib/haptics';
import { Button } from '../ui/Button';
import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';
import { useTheme } from '../ui/theme';
import { habitColor, radius, space, withAlpha } from '../ui/tokens';

type Step = 'welcome' | 'pick' | 'name';
const MAX_PICKS = 5;

export default function Onboarding() {
  const th = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('welcome');
  const [picked, setPicked] = useState<string[]>(['water', 'read']);
  const [name, setName] = useState('Pip');

  useEffect(() => {
    track('onboarding_step_viewed', { step });
  }, [step]);

  const finish = () => {
    haptics.success();
    const drafts = TEMPLATES.filter((tpl) => picked.includes(tpl.key)).map((tpl) => ({ ...tpl.draft, name: t(`templates.${tpl.key}`) }));
    useHabitStore.getState().completeOnboarding(drafts, name);
    // Value first, then the offer: the paywall follows onboarding only where it can actually sell.
    if (purchasesAvailable) setTimeout(() => openPaywall('onboarding'), 600);
  };

  const dots = (
    <View style={styles.dots}>
      {(['welcome', 'pick', 'name'] as Step[]).map((s) => (
        <View key={s} style={[styles.dot, { backgroundColor: s === step ? th.accent : th.fillStrong, width: s === step ? 22 : 8 }]} />
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: th.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {step === 'welcome' ? (
        <Animated.View key="welcome" entering={FadeIn.duration(260)} exiting={FadeOut.duration(160)} style={{ flex: 1 }}>
          <LinearGradient
            colors={['#7B61FF', '#A35CFF', '#E07BF0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.welcome, { paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.xl }]}
          >
            <View style={styles.bubble1} />
            <View style={styles.bubble2} />
            <View style={styles.welcomeArt}>
              <Companion stage={2} happy size={200} />
            </View>
            <View style={styles.welcomeCopy}>
              <Text variant="caption" tone="inverse" style={styles.eyebrow}>
                {t('onboarding.welcome.eyebrow')}
              </Text>
              <Text variant="largeTitle" tone="inverse" style={{ fontSize: 40, lineHeight: 46 }}>
                {t('onboarding.welcome.title')}
              </Text>
              <Text variant="body" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {t('onboarding.welcome.body')}
              </Text>
            </View>
            <PressableScale onPress={() => setStep('pick')} accessibilityLabel={t('onboarding.welcome.cta')} style={styles.whiteBtn}>
              <Text variant="headline" color="#6E56F8">
                {t('onboarding.welcome.cta')}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#6E56F8" />
            </PressableScale>
          </LinearGradient>
        </Animated.View>
      ) : step === 'pick' ? (
        <Animated.View key="pick" entering={FadeIn.duration(260)} exiting={FadeOut.duration(160)} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[styles.page, { paddingTop: insets.top + space.xl, paddingBottom: 140 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.inner}>
              {dots}
              <Text variant="largeTitle">{t('onboarding.pick.title')}</Text>
              <Text variant="body" tone="secondary">
                {t('onboarding.pick.body', { max: MAX_PICKS })}
              </Text>
              <View style={styles.grid}>
                {TEMPLATES.map((tpl) => {
                  const on = picked.includes(tpl.key);
                  const color = habitColor(th, tpl.draft.color);
                  return (
                    <PressableScale
                      key={tpl.key}
                      scaleTo={0.96}
                      onPress={() => {
                        if (!on && picked.length >= MAX_PICKS) {
                          haptics.warning();
                          return;
                        }
                        haptics.selection();
                        setPicked((p) => (on ? p.filter((k) => k !== tpl.key) : [...p, tpl.key]));
                      }}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={t(`templates.${tpl.key}`)}
                      style={[
                        styles.tplCard,
                        {
                          backgroundColor: on ? withAlpha(color, th.scheme === 'dark' ? 0.28 : 0.16) : th.card,
                          borderColor: on ? color : 'transparent',
                        },
                      ]}
                    >
                      <View style={[styles.tplArt, { backgroundColor: withAlpha(color, 0.18) }]}>
                        <Text style={{ fontSize: 36, lineHeight: 44 }}>{tpl.draft.emoji}</Text>
                      </View>
                      <Text variant="headline" numberOfLines={1}>
                        {t(`templates.${tpl.key}`)}
                      </Text>
                      <Text variant="caption" tone="secondary" numberOfLines={1}>
                        {t(`templates.sub.${tpl.key}`)}
                      </Text>
                      <View style={[styles.tick, { backgroundColor: on ? color : th.fill }]}>
                        {on ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
                      </View>
                    </PressableScale>
                  );
                })}
              </View>
            </View>
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg, backgroundColor: th.bg }]}>
            <Button
              label={picked.length ? t('onboarding.pick.cta', { count: picked.length }) : t('onboarding.pick.skip')}
              onPress={() => setStep('name')}
              style={styles.footerBtn}
            />
          </View>
        </Animated.View>
      ) : (
        <Animated.View
          key="name"
          entering={FadeIn.duration(260)}
          style={[styles.page, { flex: 1, paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.lg }]}
        >
          <View style={[styles.inner, { flex: 1 }]}>
            {dots}
            <Text variant="largeTitle">{t('onboarding.name.title')}</Text>
            <Text variant="body" tone="secondary">
              {t('onboarding.name.body')}
            </Text>
            <View style={styles.eggWrap}>
              <Companion stage={0} happy size={180} />
            </View>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={16}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={finish}
              accessibilityLabel={t('onboarding.name.label')}
              style={[styles.nameInput, { color: th.text, backgroundColor: th.card }]}
            />
            <View style={{ flex: 1 }} />
            <Button label={t('onboarding.name.cta', { name: name.trim() || 'Pip' })} icon="sparkles" onPress={finish} />
          </View>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  welcome: { flex: 1, paddingHorizontal: space.xxl, justifyContent: 'space-between', overflow: 'hidden' },
  bubble1: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -80,
    right: -120,
  },
  bubble2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)',
    bottom: 120,
    left: -100,
  },
  welcomeArt: { alignItems: 'center', marginTop: space.xl },
  welcomeCopy: { gap: space.md, maxWidth: 520 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.85 },
  whiteBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    maxWidth: 520,
    width: '100%',
  },
  page: { paddingHorizontal: space.lg, alignItems: 'center' },
  inner: { width: '100%', maxWidth: 560, gap: space.md },
  dots: { flexDirection: 'row', gap: 6, marginBottom: space.sm },
  dot: { height: 8, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md, marginTop: space.sm },
  tplCard: { width: '48%', padding: space.md, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 2, gap: 4 },
  tplArt: { height: 76, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  tick: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, alignItems: 'center' },
  footerBtn: { width: '100%', maxWidth: 560 },
  eggWrap: { alignItems: 'center', marginVertical: space.xl },
  nameInput: { fontSize: 24, fontWeight: '700', textAlign: 'center', height: 60, borderRadius: radius.lg, borderCurve: 'continuous' },
});
