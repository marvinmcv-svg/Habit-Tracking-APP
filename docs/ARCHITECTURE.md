# Architecture

```
apps/mobile
├── src/app/                 Expo Router routes (screens only)
│   ├── _layout.tsx          Root stack, theme, i18n, daily check, celebration overlay
│   ├── onboarding.tsx       Welcome → pick habits → name companion
│   ├── (tabs)/              Today · Habits · Awards · Profile
│   └── habit/[id].tsx, habit/edit.tsx
├── src/features/
│   ├── habits/
│   │   ├── logic/           PURE: dates, schedule, streaks, stats (+ tests)
│   │   ├── store.ts         Zustand store, persisted to SQLite; all mutations live here
│   │   ├── components/      HabitRow, HabitCard, CheckButton, MonthCalendar…
│   │   └── templates.ts     Starter habits
│   ├── gamification/        XP/levels, achievements, Pip, celebration overlay
│   └── today/               Today-screen cards (hero, streak, week strip, comeback)
├── src/lib/                 analytics, haptics, i18n, notifications, storage (+ .web shims)
└── src/ui/                  Design system: tokens, Text, Card, Button, PressableScale, ring, heatmap, badge…
supabase/                    Postgres schema, RLS policies, pgTAP tests
docs/                        This folder
```

## Data flow

1. A tap calls a store action (`tapCheckIn`), which writes `logs[habitId][localDate]`.
2. `setLog` compares before/after to decide whether today just became active or perfect and, if so,
   sets a `celebration` (once per day each) and awards a freeze on 7-day multiples.
3. Screens derive everything else with memoised pure functions (`habitStreak`, `useProgress`).
4. On launch and every foreground, `runDailyCheck` spends freezes or raises the comeback card (once per day).

## Sync

`src/features/sync/`:
- `merge.ts` — pure mapping and merge (`collectPush`, `applyPull`), unit-tested.
- `engine.ts` — `syncWith(client, userId)`: push habits → tombstones → logs → freezes, then pull each table by
  `synced_at` cursor (paged), merge into the *latest* local state. Also auth (email code), sign-out, account deletion.
- `useSync.ts` — runs sync on launch, sign-in, foreground, and 4 s after local edits (ignoring its own writes).

Server: `supabase/migrations` (schema, RLS, LWW trigger), `supabase/functions` (`delete-account`, `revenuecat-webhook`).

### Testing sync locally

```bash
POSTGREST=/path/to/postgrest supabase/tests/sync-e2e/harness.sh
```

Starts Postgres 16 + PostgREST with the migrations and a stub `auth` schema, then runs
`apps/mobile/src/features/sync/__tests__/e2e.test.ts`: two simulated devices converge, newer writes win, deletes
propagate, stale writes are rejected, and another user sees nothing.

## Monetization & telemetry

- `src/lib/purchases.ts` (RevenueCat; `.web.ts` stub) and `src/features/paywall/entitlement.ts` (`useEntitlement`,
  `openPaywall`, `openNewHabit`). Paywall route: `src/app/paywall.tsx`.
- `src/lib/telemetry.ts` starts Sentry and PostHog when their keys exist and routes `track()` to PostHog.

## Design system

Tokens in `src/ui/tokens.ts`: Apple system colours (light/dark pairs), iOS Dynamic Type ramp, 4-pt spacing,
continuous corner curves, Emil Kowalski's easing curves. Every screen renders in light and dark, in English and Spanish.
