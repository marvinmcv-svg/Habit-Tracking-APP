import { useCallback } from 'react';

import { haptics } from '../../../lib/haptics';
import { type LocalDate, today } from '../logic/dates';
import { effectiveTarget, valueOn } from '../logic/schedule';
import { tapStep, useHabitStore } from '../store';
import type { Habit } from '../types';

/** Tap handler with the matching haptic, fired in the same frame as the state change. */
export function useCheckIn(habit: Habit, date: LocalDate = today()) {
  const tap = useCallback(() => {
    const s = useHabitStore.getState();
    const target = effectiveTarget(habit);
    const current = valueOn(s.logs, habit.id, date);
    if (current >= target) haptics.light();
    else if (habit.type === 'boolean' || habit.type === 'quit' || current + tapStep(habit) >= target) haptics.success();
    else haptics.selection();
    s.tapCheckIn(habit.id, date);
  }, [habit, date]);

  const reset = useCallback(() => {
    const s = useHabitStore.getState();
    if (valueOn(s.logs, habit.id, date) === 0) return;
    haptics.medium();
    s.setLog(habit.id, date, 0);
  }, [habit.id, date]);

  return { tap, reset };
}
