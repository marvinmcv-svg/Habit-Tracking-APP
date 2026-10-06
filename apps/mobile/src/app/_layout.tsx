import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CelebrationOverlay } from '../features/gamification/CelebrationOverlay';
import { useEntitlementStore } from '../features/paywall/entitlement';
import { useBackgroundSync } from '../features/sync/useSync';
import { useHabitStore } from '../features/habits/store';
import { track } from '../lib/analytics';
import i18n, { deviceLanguage } from '../lib/i18n';
import { configurePurchases } from '../lib/purchases';
import { startTelemetry } from '../lib/telemetry';
import { useTheme } from '../ui/theme';

startTelemetry();
configurePurchases((isPro) => useEntitlementStore.setState({ isPro }));

export default function RootLayout() {
  const t = useTheme();
  const onboarded = useHabitStore((s) => s.onboarded);
  const language = useHabitStore((s) => s.settings.language);

  useEffect(() => {
    const lng = language === 'system' ? deviceLanguage() : language;
    if (i18n.language !== lng) i18n.changeLanguage(lng);
  }, [language]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.bg).catch(() => {});
  }, [t.bg]);

  // Daily check on launch and each time the app returns to the foreground:
  // spends streak freezes or raises the gentle comeback card.
  useEffect(() => {
    track('app_open');
    useHabitStore.getState().runDailyCheck();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') useHabitStore.getState().runDailyCheck();
    });
    return () => sub.remove();
  }, []);

  useBackgroundSync();

  const navTheme = t.scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.bg }}>
      <ThemeProvider
        value={{ ...navTheme, colors: { ...navTheme.colors, background: t.bg, card: t.bgElevated, primary: t.accent, text: t.text } }}
      >
        <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="habit/[id]" />
            <Stack.Screen name="insights" />
            <Stack.Screen name="shop" />
            <Stack.Screen name="account" />
            <Stack.Screen
              name="paywall"
              options={{ presentation: 'modal', animation: Platform.OS === 'android' ? 'slide_from_bottom' : 'default' }}
            />
            <Stack.Screen
              name="habit/edit"
              options={{
                presentation: 'modal',
                animation: Platform.OS === 'android' ? 'slide_from_bottom' : 'default',
              }}
            />
          </Stack.Protected>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          </Stack.Protected>
        </Stack>
        <CelebrationOverlay />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
