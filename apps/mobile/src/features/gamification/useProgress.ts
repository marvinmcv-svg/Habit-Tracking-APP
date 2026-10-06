import { useMemo } from 'react';

import { today as todayDate } from '../habits/logic/dates';
import { lifetimeTotals } from '../habits/logic/stats';
import { activeDatesFrom, globalStreak } from '../habits/logic/streaks';
import { coinBalance, useHabitStore } from '../habits/store';
import { achievementProgress } from './achievements';
import { levelFromXp, stageForLevel, totalXp } from './progression';

/** Everything derived from habits + logs that the gamified UI needs. Memoised per change. */
export function useProgress() {
  const habits = useHabitStore((s) => s.habits);
  const logs = useHabitStore((s) => s.logs);
  const frozenDates = useHabitStore((s) => s.frozenDates);
  const coinsSpent = useHabitStore((s) => s.coinsSpent);
  const comebacks = useHabitStore((s) => s.comebacks);
  const habitsCreated = useHabitStore((s) => s.habitsCreated);
  const freezes = useHabitStore((s) => s.freezes);

  return useMemo(() => {
    const today = todayDate();
    const totals = lifetimeTotals(habits, logs);
    const active = activeDatesFrom(habits, logs);
    const frozen = new Set(frozenDates);
    const streak = globalStreak(active, frozen, today);
    const xp = totalXp(totals);
    const level = levelFromXp(xp);
    return {
      today,
      totals,
      active,
      frozen,
      streak,
      xp,
      level,
      stage: stageForLevel(level.level),
      coins: coinBalance({ habits, logs, coinsSpent }),
      freezes,
      achievements: achievementProgress({ ...totals, longestStreak: streak.longest, habitsCreated, comebacks }),
    };
  }, [habits, logs, frozenDates, coinsSpent, comebacks, habitsCreated, freezes]);
}
