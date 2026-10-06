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

## Sync (Phase 1 plan)

Local-first, last-write-wins per row by `updated_at`, deletes as tombstones (`deleted_at`). The Postgres schema
in `supabase/migrations` already mirrors the client model; the sync engine will push dirty rows and pull rows with
`updated_at > lastPulledAt`, scoped by RLS.

## Design system

Tokens in `src/ui/tokens.ts`: Apple system colours (light/dark pairs), iOS Dynamic Type ramp, 4-pt spacing,
continuous corner curves, Emil Kowalski's easing curves. Every screen renders in light and dark, in English and Spanish.
