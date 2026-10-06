import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, PACKAGE_TYPE, type PurchasesPackage } from 'react-native-purchases';

import type { Plan } from './purchases.types';

export type { Plan } from './purchases.types';

const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

/** RevenueCat entitlement identifier that unlocks Pro. */
export const PRO_ENTITLEMENT = 'pro';
export const purchasesAvailable = !!apiKey;

let configured = false;
const packages = new Map<string, PurchasesPackage>();

export const isProFrom = (info: CustomerInfo) => info.entitlements.active[PRO_ENTITLEMENT] !== undefined;

export function configurePurchases(onChange: (isPro: boolean) => void) {
  if (!apiKey || configured) return;
  Purchases.configure({ apiKey });
  configured = true;
  Purchases.addCustomerInfoUpdateListener((info) => onChange(isProFrom(info)));
  Purchases.getCustomerInfo()
    .then((info) => onChange(isProFrom(info)))
    .catch(() => {});
}

/** Ties purchases to the Supabase user so the webhook can write entitlements_cache. */
export async function identifyPurchaser(userId: string | null) {
  if (!configured) return;
  try {
    if (userId) await Purchases.logIn(userId);
    else if (!(await Purchases.isAnonymous())) await Purchases.logOut();
  } catch {
    // Non-fatal: purchases still work anonymously.
  }
}

function kindOf(p: PurchasesPackage): Plan['kind'] | null {
  if (p.packageType === PACKAGE_TYPE.ANNUAL) return 'annual';
  if (p.packageType === PACKAGE_TYPE.MONTHLY) return 'monthly';
  if (p.packageType === PACKAGE_TYPE.LIFETIME) return 'lifetime';
  return null;
}

export async function getPlans(): Promise<Plan[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return [];
  packages.clear();
  const plans: Plan[] = [];
  for (const p of current.availablePackages) {
    const kind = kindOf(p);
    if (!kind) continue;
    packages.set(p.identifier, p);
    const intro = p.product.introPrice;
    const trialDays =
      intro && intro.price === 0
        ? intro.periodUnit === 'WEEK'
          ? intro.periodNumberOfUnits * 7
          : intro.periodUnit === 'MONTH'
            ? intro.periodNumberOfUnits * 30
            : intro.periodNumberOfUnits
        : null;
    plans.push({
      id: p.identifier,
      kind,
      price: p.product.price,
      priceString: p.product.priceString,
      pricePerMonthString: p.product.pricePerMonthString ?? null,
      currencyCode: p.product.currencyCode,
      trialDays,
    });
  }
  const order = { annual: 0, monthly: 1, lifetime: 2 };
  return plans.sort((a, b) => order[a.kind] - order[b.kind]);
}

/** Returns true when Pro is active afterwards. A user cancel resolves false, not an error. */
export async function purchase(planId: string): Promise<boolean> {
  const pkg = packages.get(planId);
  if (!pkg) throw new Error('Plan not available');
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return isProFrom(customerInfo);
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return false;
    throw e;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!configured) return false;
  return isProFrom(await Purchases.restorePurchases());
}
