# Analytics

All events go through `track()` in `apps/mobile/src/lib/analytics.ts` (typed `AnalyticsEvent` union).

| Event | Where | Props |
| --- | --- | --- |
| `app_open` | root layout mount | — |
| `onboarding_step_viewed` | each onboarding step | `step` |
| `onboarding_completed` | finishing onboarding | `habits` |
| `habit_created` / `habit_updated` / `habit_archived` / `habit_deleted` | store | `type`, `schedule`, `reminder` / `archived` |
| `habit_logged` | every log write | `type`, `done` |
| `streak_freeze_used` | daily check | `days` |
| `streak_broken` | daily check | `lost` |
| `streak_freeze_purchased` | Awards → buy | — |
| `streak_repaired` | comeback card | `days` |
| `comeback_started` | comeback card → start fresh | — |

| `adventure_started` / `adventure_claimed` | adventure card | `coins` |
| `shop_item_purchased` | closet | `item`, `price` |
| `paywall_viewed` / `paywall_dismissed` | every paywall entry point | `source` (onboarding, habit_cap, insights, profile) |
| `trial_started` / `purchase_completed` / `purchase_restored` | paywall | `plan`, `source` |
| `signed_in` / `signed_out` / `account_deleted` | account screen | — |
| `sync_completed` / `sync_failed` | sync engine | `pushed`, `pulled` |

Events go to PostHog when `EXPO_PUBLIC_POSTHOG_KEY` is set. Still to add with their phases:
`shared_habit_*`, `health_link_enabled`, `notification_opened`.
