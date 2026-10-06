import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Companion } from '../features/gamification/Companion';
import { useProgress } from '../features/gamification/useProgress';
import { useEntitlementStore } from '../features/paywall/entitlement';
import { track } from '../lib/analytics';
import { haptics } from '../lib/haptics';
import { type Plan, getPlans, purchase, purchasesAvailable, restorePurchases } from '../lib/purchases';
import { Button } from '../ui/Button';
import { CircleButton } from '../ui/NavBar';
import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';
import { useTheme } from '../ui/theme';
import { radius, space } from '../ui/tokens';

const INCLUDED = ['unlimited', 'insights', 'support'] as const;
const SOON = ['shared', 'health', 'journeys', 'coach'] as const;

/**
 * Dismissible, honest paywall: annual is the pre-selected hero, the trial length and
 * the renewal price are stated in plain words next to the button, restore is always there.
 */
export default function Paywall() {
  const th = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const p = useProgress();
  const isPro = useEntitlementStore((s) => s.isPro);
  const [plans, setPlans] = useState<Plan[] | null>(purchasesAvailable ? null : []);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!purchasesAvailable) return;
    getPlans()
      .then((list) => {
        setPlans(list);
        setSelected(list.find((x) => x.kind === 'annual')?.id ?? list[0]?.id ?? null);
      })
      .catch(() => setPlans([]));
  }, []);

  const close = () => {
    track('paywall_dismissed', { source: source ?? 'unknown' });
    router.back();
  };

  const plan = plans?.find((x) => x.id === selected) ?? null;
  const monthly = plans?.find((x) => x.kind === 'monthly');
  const annual = plans?.find((x) => x.kind === 'annual');
  const savings = monthly && annual && monthly.price > 0 ? Math.round((1 - annual.price / (monthly.price * 12)) * 100) : null;

  const buy = async () => {
    if (!plan) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await purchase(plan.id);
      if (ok) {
        haptics.success();
        track(plan.trialDays ? 'trial_started' : 'purchase_completed', { plan: plan.kind, source: source ?? 'unknown' });
        useEntitlementStore.setState({ isPro: true });
        router.back();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('paywall.error'));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      const ok = await restorePurchases();
      if (ok) {
        track('purchase_restored');
        useEntitlementStore.setState({ isPro: true });
        router.back();
      } else setError(t('paywall.nothingToRestore'));
    } catch {
      setError(t('paywall.error'));
    } finally {
      setBusy(false);
    }
  };

  const terms = plan
    ? plan.trialDays
      ? t(`paywall.terms.trial.${plan.kind === 'annual' ? 'annual' : 'monthly'}`, { days: plan.trialDays, price: plan.priceString })
      : plan.kind === 'lifetime'
        ? t('paywall.terms.lifetime', { price: plan.priceString })
        : t(`paywall.terms.plain.${plan.kind === 'annual' ? 'annual' : 'monthly'}`, { price: plan.priceString })
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: th.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 200 }} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#7B61FF', '#A35CFF', '#E07BF0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + space.xl }]}
        >
          <View style={[styles.close, { top: insets.top + space.sm }]}>
            <CircleButton icon="close" label={t('common.close')} onPress={close} color="#FFF" />
          </View>
          <Companion stage={Math.max(p.stage, 2) as 2 | 3 | 4} happy size={130} />
          <Text variant="caption" tone="inverse" style={styles.eyebrow}>
            Bloom Pro
          </Text>
          <Text variant="title1" tone="inverse" align="center">
            {isPro ? t('paywall.thanks') : t('paywall.title')}
          </Text>
        </LinearGradient>

        <View style={styles.body}>
          {INCLUDED.map((k) => (
            <View key={k} style={styles.benefit}>
              <Ionicons name="checkmark-circle" size={22} color={th.success} />
              <Text variant="body" style={{ flex: 1 }}>
                {t(`paywall.benefit.${k}`)}
              </Text>
            </View>
          ))}
          <Text variant="footnote" tone="secondary" style={styles.soonTitle}>
            {t('paywall.soonTitle')}
          </Text>
          {SOON.map((k) => (
            <View key={k} style={styles.benefit}>
              <Ionicons name="time-outline" size={20} color={th.textTertiary} />
              <Text variant="subhead" tone="secondary" style={{ flex: 1 }}>
                {t(`paywall.soon.${k}`)}
              </Text>
            </View>
          ))}

          {plans === null ? (
            <ActivityIndicator style={{ marginTop: space.xl }} />
          ) : plans.length === 0 ? (
            <View style={[styles.unavailable, { backgroundColor: th.fill }]}>
              <Ionicons name="phone-portrait-outline" size={20} color={th.textSecondary} />
              <Text variant="subhead" tone="secondary" style={{ flex: 1 }}>
                {Platform.OS === 'web' ? t('paywall.webOnly') : t('paywall.unavailable')}
              </Text>
            </View>
          ) : (
            <View style={{ gap: space.sm, marginTop: space.lg }}>
              {plans.map((pl) => {
                const sel = pl.id === selected;
                return (
                  <PressableScale
                    key={pl.id}
                    onPress={() => {
                      haptics.selection();
                      setSelected(pl.id);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: sel }}
                    accessibilityLabel={`${t(`paywall.plan.${pl.kind}`)} ${pl.priceString}`}
                    style={[styles.plan, { backgroundColor: th.card, borderColor: sel ? th.accent : th.separator }]}
                  >
                    <Ionicons name={sel ? 'radio-button-on' : 'radio-button-off'} size={22} color={sel ? th.accent : th.textTertiary} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.planTitle}>
                        <Text variant="headline">{t(`paywall.plan.${pl.kind}`)}</Text>
                        {pl.kind === 'annual' && savings && savings > 0 ? (
                          <View style={[styles.save, { backgroundColor: th.accentSoft }]}>
                            <Text variant="caption2" tone="accent" weight="800">
                              {t('paywall.save', { pct: savings })}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      {pl.kind === 'annual' && pl.pricePerMonthString ? (
                        <Text variant="footnote" tone="secondary">
                          {t('paywall.perMonth', { price: pl.pricePerMonthString })}
                        </Text>
                      ) : null}
                    </View>
                    <Text variant="headline" tabular>
                      {pl.priceString}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md, backgroundColor: th.bg, borderTopColor: th.separator }]}>
        {error ? (
          <Text variant="footnote" color={th.danger} align="center">
            {error}
          </Text>
        ) : null}
        {plans && plans.length > 0 ? (
          <Button
            label={plan?.trialDays ? t('paywall.ctaTrial', { days: plan.trialDays }) : t('paywall.cta')}
            onPress={buy}
            loading={busy}
            disabled={!plan || isPro}
          />
        ) : (
          <Button label={t('common.continue')} variant="secondary" onPress={close} />
        )}
        {terms ? (
          <Text variant="caption" tone="secondary" align="center">
            {terms}
          </Text>
        ) : null}
        {plans && plans.length > 0 ? (
          <View style={styles.links}>
            <PressableScale onPress={close} accessibilityLabel={t('paywall.notNow')}>
              <Text variant="footnote" tone="secondary" weight="600">
                {t('paywall.notNow')}
              </Text>
            </PressableScale>
            {purchasesAvailable ? (
              <PressableScale onPress={restore} accessibilityLabel={t('paywall.restore')}>
                <Text variant="footnote" tone="accent" weight="600">
                  {t('paywall.restore')}
                </Text>
              </PressableScale>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.sm },
  close: { position: 'absolute', left: space.lg },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.85 },
  body: { paddingHorizontal: space.xl, paddingTop: space.xl, gap: space.md, width: '100%', maxWidth: 560, alignSelf: 'center' },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  soonTitle: { textTransform: 'uppercase', letterSpacing: 0.4, marginTop: space.sm },
  unavailable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    marginTop: space.lg,
  },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 2,
  },
  planTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  save: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    gap: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
});
