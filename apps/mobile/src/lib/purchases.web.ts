// Store subscriptions only exist in the iOS and Android apps.
import type { Plan } from './purchases.types';

export type { Plan } from './purchases.types';

export const PRO_ENTITLEMENT = 'pro';
export const purchasesAvailable = false;
export function configurePurchases(_onChange: (isPro: boolean) => void) {}
export async function identifyPurchaser(_userId: string | null) {}
export async function getPlans(): Promise<Plan[]> {
  return [];
}
export async function purchase(_planId: string): Promise<boolean> {
  return false;
}
export async function restorePurchases(): Promise<boolean> {
  return false;
}
