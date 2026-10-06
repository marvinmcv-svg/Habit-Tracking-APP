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

### 2026-10-06 · SDKs are installed but key-gated (superseded the "not installed yet" note)
Supabase, RevenueCat, PostHog and Sentry are wired in, and each turns on only when its public key is
present (`apps/mobile/.env.example`). Without keys the app behaves exactly as before: local-only, ungated,
unobserved. The `@sentry/react-native` config plugin is intentionally **not** in `app.json`: it only uploads
source maps and fails EAS builds without `SENTRY_AUTH_TOKEN`/org/project. Add it once those exist.

### 2026-10-06 · Web export is a verification tool, not a product
`expo export --platform web` lets CI and reviewers render real screens in a browser. Storage and
notifications have `.web.ts` shims. Web stays a non-goal for v1.

### 2026-10-07 · Sync: last-write-wins on top of the existing store (Drizzle stays deferred)
- Every log write is stamped (`logStamps["habitId|date"]`), habits carry `updatedAt`, deletes leave
  `habitTombstones`. Push = everything stamped since the last successful push; pull = rows with
  `synced_at > cursor`.
- `updated_at` is the **client** write time and decides who wins. `synced_at` is set by the server with
  `clock_timestamp()` on every accepted write and is the **pull cursor**, so a device with a wrong clock can
  never hide rows from others, and rows written in one transaction never share a cursor value.
- A server trigger (`lww_guard`) drops writes whose `updated_at` is older than the stored row.
- Verified end-to-end against real Postgres 16 + PostgREST with RLS (`supabase/tests/sync-e2e`), in CI.
- Drizzle: not needed at this data size; the merge logic is pure and fully tested. Revisit if per-user data
  outgrows a JSON document (thousands of habits) or we need SQL queries on device.
*Alternatives:* PowerSync/ElectricSQL — powerful, but another vendor and service to run for a single-user dataset.

### 2026-10-07 · Sign-in by email one-time code
Codes work identically on iOS, Android and web without deep-link setup, and need no password. Apple/Google
sign-in can be added to the same Supabase project later; Apple requires it only if other social logins exist.
Account deletion is in-app (store requirement) via the `delete-account` Edge Function.

### 2026-10-07 · Paywall gates only where purchases are possible
`useEntitlement().unlocked` is true when the user is Pro **or** this build cannot sell (web, or no RevenueCat
key). Users are never blocked by a paywall they cannot pay through. Free plan: 5 active habits and 7/30-day
insights; Pro: unlimited habits and 90-day insights. Features not built yet are listed as "Coming to Pro" —
never sold as if they existed. Annual is pre-selected; trial length and renewal price sit next to the button.
The client trusts RevenueCat's `CustomerInfo` for UI gating; server features must check `entitlements_cache`
(written only by the webhook).

### 2026-10-07 · Adventures and the closet
Adventures are wall-clock timestamps in the persisted store, so they survive app kills and reboots; a local
notification fires when Pip returns. Starting one requires today's streak to be secured, so the appointment
mechanic rewards showing up rather than replacing it. Coins from adventures are stored (`coinsBonus`); coins
from check-ins stay derived.

### 2026-10-07 · Home-screen widgets deferred
WidgetKit and Android App Widgets need native targets that can't be built or verified in this environment.
Planned approach: `expo-widgets`/a config plugin reading a small JSON snapshot (streak, today's progress, Pip's
stage) that the app writes on every change.

### 2026-10-07 · Web build deployed to Vercel as a preview
The static web export (`expo export --platform web`) is deployed from `apps/mobile` with an SPA rewrite.
It is a shareable preview of the product; the shipping targets remain iOS and Android.
