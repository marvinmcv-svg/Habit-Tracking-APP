import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';

import { setAnalyticsSink } from './analytics';

let started = false;

/**
 * Wires PostHog (product analytics) and Sentry (crashes) when their keys are present.
 * Both are optional: without keys the app runs exactly the same, just unobserved.
 */
export function startTelemetry() {
  if (started) return;
  started = true;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (dsn) {
    Sentry.init({ dsn, tracesSampleRate: 0.1, sendDefaultPii: false });
  }

  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (key) {
    const posthog = new PostHog(key, { host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com' });
    setAnalyticsSink((event, props) => posthog.capture(event, props as Record<string, string | number | boolean | null>));
  }
}
