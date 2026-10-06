import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { track } from '../../lib/analytics';
import { uuid } from '../../lib/id';
import { appStorage } from '../../lib/storage';
import { FREEZE_EARN_EVERY, FREEZE_PRICE, MAX_FREEZES, coinsEarned } from '../gamification/progression';
import { type LocalDate, addDays, diffDays, today as todayDate } from './logic/dates';
import { effectiveTarget, valueOn } from './logic/schedule';
import { isPerfectDay, lifetimeTotals } from './logic/stats';
import { activeDatesFrom, applyFreezes, globalStreak } from './logic/streaks';
import type { Habit, LogMap } from './types';

export const REPAIR_PRICE = 120;
export const REPAIR_MAX_DAYS = 3;

export type ThemePref = 'system' | 'light' | 'dark';
export type LanguagePref = 'system' | 'en' | 'es';

export interface Settings {
  theme: ThemePref;
  language: LanguagePref;
  haptics: boolean;
  weekStartsOn: 0 | 1;
}

export type Celebration =
  | { kind: 'streak'; streak: number; earnedFreeze: boolean; perfect: boolean }
  | { kind: 'perfect' }
  | { kind: 'freezeUsed'; days: number; streak: number };

export interface Comeback {
  /** Last covered day before the break — identifies this particular break. */
  key: LocalDate;
  lostStreak: number;
  missedDays: number;
}

export type HabitDraft = Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt' | 'order' | 'startDate'> & {
  startDate?: LocalDate;
};

interface PersistedState {
  habits: Habit[];
  logs: LogMap;
  frozenDates: LocalDate[];
  freezes: number;
  coinsSpent: number;
  comebacks: number;
  habitsCreated: number;
  onboarded: boolean;
  companionName: string;
  settings: Settings;
  lastDailyCheck: LocalDate | null;
  lastFreezeAward: LocalDate | null;
  celebrated: { streak: LocalDate | null; perfect: LocalDate | null };
  comeback: Comeback | null;
  dismissedComeback: LocalDate | null;
}

interface Actions {
  addHabit: (draft: HabitDraft) => Habit;
  updateHabit: (id: string, patch: Partial<HabitDraft>) => void;
  archiveHabit: (id: string, archived: boolean) => void;
  deleteHabit: (id: string) => void;
  reorderHabits: (ids: string[]) => void;
  setLog: (habitId: string, date: LocalDate, value: number) => void;
  /** One-tap check-in: completes boolean habits, steps count/duration habits, toggles off when done. */
  tapCheckIn: (habitId: string, date?: LocalDate) => void;
  runDailyCheck: (today?: LocalDate) => void;
  buyFreeze: () => boolean;
  repairStreak: () => boolean;
  startFresh: () => void;
  dismissCelebration: () => void;
  completeOnboarding: (habits: HabitDraft[], companionName: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  setCompanionName: (name: string) => void;
  resetAll: () => void;
}

export type HabitState = PersistedState & Actions & { celebration: Celebration | null };

const initial: PersistedState = {
  habits: [],
  logs: {},
  frozenDates: [],
  freezes: 1,
  coinsSpent: 0,
  comebacks: 0,
  habitsCreated: 0,
  onboarded: false,
  companionName: 'Pip',
  settings: { theme: 'system', language: 'system', haptics: true, weekStartsOn: 1 },
  lastDailyCheck: null,
  lastFreezeAward: null,
  celebrated: { streak: null, perfect: null },
  comeback: null,
  dismissedComeback: null,
};

/** Step size for one tap on count and duration habits. */
export function tapStep(habit: Habit): number {
  if (habit.type === 'count') return 1;
  if (habit.type === 'duration') return habit.target <= 10 ? habit.target : Math.max(5, Math.round(habit.target / 4 / 5) * 5);
  return 1;
}

export function coinBalance(s: Pick<PersistedState, 'habits' | 'logs' | 'coinsSpent'>): number {
  return coinsEarned(lifetimeTotals(s.habits, s.logs)) - s.coinsSpent;
}

export const useHabitStore = create<HabitState>()(
  persist(
    (set, get) => ({
      ...initial,
      celebration: null,

      addHabit: (draft) => {
        const now = new Date().toISOString();
        const habit: Habit = {
          ...draft,
          startDate: draft.startDate ?? todayDate(),
          id: uuid(),
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
          order: get().habits.length,
        };
        set((s) => ({ habits: [...s.habits, habit], habitsCreated: s.habitsCreated + 1 }));
        track('habit_created', { type: habit.type, schedule: habit.schedule.kind, reminder: !!habit.reminderTime });
        return habit;
      },

      updateHabit: (id, patch) => {
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch, updatedAt: new Date().toISOString() } : h)),
        }));
        track('habit_updated');
      },

      archiveHabit: (id, archived) => {
        set((s) => ({
          habits: s.habits.map((h) =>
            h.id === id ? { ...h, archivedAt: archived ? new Date().toISOString() : null, updatedAt: new Date().toISOString() } : h,
          ),
        }));
        track('habit_archived', { archived });
      },

      deleteHabit: (id) => {
        set((s) => {
          const logs = { ...s.logs };
          delete logs[id];
          return { habits: s.habits.filter((h) => h.id !== id), logs };
        });
        track('habit_deleted');
      },

      reorderHabits: (ids) => {
        set((s) => ({
          habits: s.habits.map((h) => {
            const i = ids.indexOf(h.id);
            return i === -1 ? h : { ...h, order: i };
          }),
        }));
      },

      setLog: (habitId, date, value) => {
        const before = get();
        const habit = before.habits.find((h) => h.id === habitId);
        if (!habit) return;

        const wasActive = activeDatesFrom(before.habits, before.logs).has(date);
        const wasPerfect = isPerfectDay(before.habits, before.logs, date);

        const byDate = { ...(before.logs[habitId] ?? {}) };
        if (value <= 0) delete byDate[date];
        else byDate[date] = value;
        const logs = { ...before.logs, [habitId]: byDate };

        set({ logs });
        track('habit_logged', { type: habit.type, done: value >= effectiveTarget(habit) });

        // Celebrations only for today — editing history should stay quiet.
        const today = todayDate();
        if (date !== today) return;
        const active = activeDatesFrom(before.habits, logs);
        const nowActive = active.has(today);
        const nowPerfect = isPerfectDay(before.habits, logs, today);
        const { celebrated } = before;

        if (nowActive && !wasActive && celebrated.streak !== today) {
          const streak = globalStreak(active, new Set(before.frozenDates), today).current;
          const earnFreeze =
            streak > 0 && streak % FREEZE_EARN_EVERY === 0 && before.freezes < MAX_FREEZES && before.lastFreezeAward !== today;
          set({
            celebration: { kind: 'streak', streak, earnedFreeze: earnFreeze, perfect: nowPerfect },
            celebrated: { streak: today, perfect: nowPerfect ? today : celebrated.perfect },
            ...(earnFreeze ? { freezes: before.freezes + 1, lastFreezeAward: today } : null),
          });
          return;
        }
        if (nowPerfect && !wasPerfect && celebrated.perfect !== today) {
          set({ celebration: { kind: 'perfect' }, celebrated: { ...celebrated, perfect: today } });
        }
      },

      tapCheckIn: (habitId, date = todayDate()) => {
        const s = get();
        const habit = s.habits.find((h) => h.id === habitId);
        if (!habit) return;
        const target = effectiveTarget(habit);
        const current = valueOn(s.logs, habitId, date);
        if (current >= target) {
          get().setLog(habitId, date, 0);
          return;
        }
        const next = habit.type === 'boolean' || habit.type === 'quit' ? 1 : Math.min(target, current + tapStep(habit));
        get().setLog(habitId, date, next);
      },

      runDailyCheck: (today = todayDate()) => {
        const s = get();
        if (s.lastDailyCheck === today) return;
        const active = activeDatesFrom(s.habits, s.logs);
        const frozen = new Set(s.frozenDates);
        const r = applyFreezes(active, frozen, s.freezes, today);
        const patch: Partial<HabitState> = { lastDailyCheck: today };

        if (r.frozen.length > 0) {
          const streak = globalStreak(active, new Set([...frozen, ...r.frozen]), today).current;
          patch.frozenDates = [...s.frozenDates, ...r.frozen];
          patch.freezes = r.freezesLeft;
          patch.celebration = { kind: 'freezeUsed', days: r.frozen.length, streak };
          track('streak_freeze_used', { days: r.frozen.length });
        } else if (r.broken && r.lastCovered && s.dismissedComeback !== r.lastCovered) {
          patch.comeback = {
            key: r.lastCovered,
            lostStreak: r.lostStreak,
            missedDays: diffDays(r.lastCovered, today) - 1,
          };
          track('streak_broken', { lost: r.lostStreak });
        }
        set(patch);
      },

      buyFreeze: () => {
        const s = get();
        if (s.freezes >= MAX_FREEZES || coinBalance(s) < FREEZE_PRICE) return false;
        set({ freezes: s.freezes + 1, coinsSpent: s.coinsSpent + FREEZE_PRICE });
        track('streak_freeze_purchased');
        return true;
      },

      repairStreak: () => {
        const s = get();
        const cb = s.comeback;
        if (!cb || cb.missedDays > REPAIR_MAX_DAYS || coinBalance(s) < REPAIR_PRICE) return false;
        const days: LocalDate[] = [];
        for (let i = 1; i <= cb.missedDays; i++) days.push(addDays(cb.key, i));
        set({
          frozenDates: [...s.frozenDates, ...days],
          coinsSpent: s.coinsSpent + REPAIR_PRICE,
          comeback: null,
          dismissedComeback: cb.key,
        });
        track('streak_repaired', { days: days.length });
        return true;
      },

      startFresh: () => {
        const s = get();
        set({ comeback: null, dismissedComeback: s.comeback?.key ?? null, comebacks: s.comebacks + 1 });
        track('comeback_started');
      },

      dismissCelebration: () => set({ celebration: null }),

      completeOnboarding: (drafts, companionName) => {
        drafts.forEach((d) => get().addHabit(d));
        set({ onboarded: true, companionName: companionName.trim() || initial.companionName, lastDailyCheck: todayDate() });
        track('onboarding_completed', { habits: drafts.length });
      },

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setCompanionName: (name) => set({ companionName: name.trim() || initial.companionName }),
      resetAll: () => set({ ...initial, celebration: null }),
    }),
    {
      name: 'bloom-store',
      version: 1,
      storage: createJSONStorage(() => appStorage),
      partialize: ({ celebration: _c, ...rest }) => {
        // Strip actions — only data is persisted.
        const data: Partial<PersistedState> = {};
        for (const k of Object.keys(initial) as (keyof PersistedState)[]) {
          (data as Record<string, unknown>)[k] = rest[k];
        }
        return data as PersistedState;
      },
    },
  ),
);
