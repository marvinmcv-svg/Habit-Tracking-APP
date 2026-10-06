import { router } from 'expo-router';
import { create } from 'zustand';

import { track } from '../../lib/analytics';
import { purchasesAvailable } from '../../lib/purchases';
import { useHabitStore } from '../habits/store';

/** Free plan: everything except more than this many active habits and long-range insights. */
export const FREE_HABIT_LIMIT = 5;

interface EntitlementState {
  isPro: boolean;
}

export const useEntitlementStore = create<EntitlementState>(() => ({ isPro: false }));

export type PaywallSource = 'onboarding' | 'habit_cap' | 'insights' | 'profile';

/**
 * The single entitlement check. When subscriptions aren't available on this build
 * (web preview, or no RevenueCat key configured), nothing is gated — users are never
 * blocked by a paywall they cannot pay through.
 */
export function useEntitlement() {
  const isPro = useEntitlementStore((s) => s.isPro);
  return { isPro, available: purchasesAvailable, unlocked: isPro || !purchasesAvailable };
}

export function isUnlocked() {
  return useEntitlementStore.getState().isPro || !purchasesAvailable;
}

export function openPaywall(source: PaywallSource) {
  track('paywall_viewed', { source });
  router.push({ pathname: '/paywall', params: { source } });
}

/** Entry point for every "new habit" button: respects the free cap. */
export function openNewHabit() {
  const active = useHabitStore.getState().habits.filter((h) => !h.archivedAt).length;
  if (!isUnlocked() && active >= FREE_HABIT_LIMIT) {
    openPaywall('habit_cap');
    return;
  }
  router.push('/habit/edit');
}
