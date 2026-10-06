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

Still to add with their phases: `adventure_*`, `paywall_viewed(source)`, `trial_started`, `purchase_*`,
`shared_habit_*`, `health_link_enabled`, `notification_opened`.
