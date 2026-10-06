/**
 * Analytics facade. Every product event goes through `track` so the provider
 * (PostHog, per docs/DECISIONS.md) can be swapped in without touching features.
 * Until EXPO_PUBLIC_POSTHOG_KEY is configured this only logs in development.
 */
export type AnalyticsEvent =
  | 'app_open'
  | 'onboarding_step_viewed'
  | 'onboarding_completed'
  | 'habit_created'
  | 'habit_updated'
  | 'habit_archived'
  | 'habit_deleted'
  | 'habit_logged'
  | 'streak_broken'
  | 'streak_freeze_used'
  | 'streak_freeze_purchased'
  | 'streak_repaired'
  | 'comeback_started'
  | 'notification_opened'
  | 'adventure_started'
  | 'adventure_claimed'
  | 'shop_item_purchased'
  | 'paywall_viewed'
  | 'paywall_dismissed'
  | 'trial_started'
  | 'purchase_completed'
  | 'purchase_restored'
  | 'signed_in'
  | 'signed_out'
  | 'account_deleted'
  | 'sync_completed'
  | 'sync_failed';

type Props = Record<string, string | number | boolean | null | undefined>;

type Sink = (event: AnalyticsEvent, props?: Props) => void;

let sink: Sink | null = null;

export function setAnalyticsSink(next: Sink | null) {
  sink = next;
}

export function track(event: AnalyticsEvent, props?: Props) {
  if (sink) {
    sink(event, props);
  } else if (__DEV__ && process.env.NODE_ENV !== 'test') {
    console.log(`[analytics] ${event}`, props ?? '');
  }
}
