# Decisions

Format: date · decision · reason · alternatives considered.

### 2026-10-06 · Expo SDK 57, React Native 0.86, Expo Router, TypeScript strict
Latest stable SDK at time of writing. New Architecture is required by Reanimated 4.
*Alternatives:* bare React Native — rejected, CNG + EAS cover every native need on the roadmap.

### 2026-10-06 · Working name "Bloom", companion "Pip"
The companion literally blooms (egg → hatchling → sprout → bloom → guardian), tying the brand to the retention loop.
The name lives in `app.json`, the i18n files and `profile.exportTitle`; renaming is a find/replace.

### 2026-10-06 · Phase 0/1 persistence: Zustand `persist` over expo-sqlite's key-value store (not Drizzle yet)
The data set for a single user is small (habits + one number per habit per day). Storing the normalized store
as JSON in SQLite (`expo-sqlite/kv-store`, sync API) gives offline-first persistence with **synchronous
hydration** — Today renders with data on the first frame, with no loading flash — and keeps the domain logic
pure and fully unit-tested.
Every record already uses UUIDs, `createdAt`/`updatedAt`, and a tombstone-friendly shape matching the
Postgres schema, so moving to relational tables is mechanical.
*Plan:* introduce Drizzle + relational SQLite tables in Phase 1 **together with the sync engine**, when
per-row `updated_at` and tombstones start to matter.
*Alternatives:* Drizzle from day one — more moving parts (migrations, async hydration) before there is
anything to sync to.

### 2026-10-06 · Domain logic is pure functions over "local dates" (`YYYY-MM-DD`)
All streak/schedule math works on calendar dates using UTC arithmetic, so DST transitions can never add or
remove a day. "Today" is computed from the device's current timezone, which makes a timezone change behave
as the user expects (the new local date is used from then on). Tests run with `TZ=America/New_York` and cover DST.

### 2026-10-06 · Derived, not stored, gamification
XP, level, companion stage, coins earned and achievements are derived from logs (`useProgress`). Only
spending (`coinsSpent`), freezes, comebacks and frozen dates are stored. Undoing a check-in therefore
can't leave XP or badges out of sync, and sync only needs to move logs.

### 2026-10-06 · Streak model
- **Per-habit streak:** consecutive scheduled days completed; unscheduled days are skipped; today is pending.
  `x_per_week` habits streak in weeks.
- **App streak (Duolingo-style):** a day counts when any habit hits its target. This is the low-pressure,
  ADHD-friendly choice — "show up once" keeps the flame alive.
- **Freezes:** start with 1, earn 1 per 7-day streak (max 2), buy for 60 coins. Applied automatically on the
  first open after a missed day, only if they cover *every* missed day.
- **Comeback, not guilt:** if freezes can't cover the gap, a warm card offers *Repair* (120 coins, ≤3 missed
  days) or *Start fresh* (free, counts toward the "Comeback" badge). Shown once per break.

### 2026-10-06 · Motion follows Emil Kowalski's `animate-expo` rules
- Tab switches don't animate (`animation: 'none'`); tabs are peers.
- Press feedback is a 120ms Reanimated **CSS transition** to scale 0.97 on the Pressable itself — no shared values.
- Check-in state changes are 180ms colour/scale transitions; the progress ring eases 360ms on the UI thread.
- The delight budget (celebration overlay, companion idle breathing) is spent only on rare moments.
  The overlay enters from scale 0.9, never 0.
- One haptic per action, in the same frame as the visual, never as the only feedback; can be turned off.
- Reduce Motion: scales become dims, the companion stops breathing, the overlay just fades.

### 2026-10-06 · Custom floating tab bar instead of `NativeTabs`
The reference designs use a floating pill bar. A custom JS tab bar gives the same look on iOS and Android
(blur on iOS, a solid translucent fill on Android where `BlurView` is costly). Revisit `NativeTabs` for
iOS 26 Liquid Glass once it has stable Android parity.

### 2026-10-06 · Analytics/Sentry/RevenueCat/Supabase SDKs are not installed yet
They need real keys and native builds to be useful. `src/lib/analytics.ts` is a typed facade with the full
event list already emitted from the store, so wiring PostHog is a one-line `setAnalyticsSink`.
Values to supply are listed in `apps/mobile/.env.example`.

### 2026-10-06 · Web export is a verification tool, not a product
`expo export --platform web` lets CI and reviewers render real screens in a browser. Storage and
notifications have `.web.ts` shims. Web stays a non-goal for v1.
