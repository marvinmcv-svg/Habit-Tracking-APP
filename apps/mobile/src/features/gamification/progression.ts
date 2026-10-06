import type { LifetimeTotals } from '../habits/logic/stats';

export const XP_PER_CHECKIN = 10;
export const XP_PER_PERFECT_DAY = 20;
export const COINS_PER_CHECKIN = 5;
export const COINS_PER_PERFECT_DAY = 10;
export const FREEZE_PRICE = 60;
export const MAX_FREEZES = 2;
/** A free freeze is earned every time the global streak reaches a multiple of this. */
export const FREEZE_EARN_EVERY = 7;

export function totalXp(t: Pick<LifetimeTotals, 'checkins' | 'perfectDays'>): number {
  return t.checkins * XP_PER_CHECKIN + t.perfectDays * XP_PER_PERFECT_DAY;
}

export function coinsEarned(t: Pick<LifetimeTotals, 'checkins' | 'perfectDays'>): number {
  return t.checkins * COINS_PER_CHECKIN + t.perfectDays * COINS_PER_PERFECT_DAY;
}

/** XP needed to go from level n to n+1. Grows gently so early levels come quickly. */
export function xpForLevel(level: number): number {
  return 50 + (level - 1) * 25;
}

export interface LevelInfo {
  level: number;
  /** XP into the current level. */
  into: number;
  /** XP the current level needs in total. */
  needed: number;
  progress: number;
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, xp);
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  const needed = xpForLevel(level);
  return { level, into: remaining, needed, progress: remaining / needed };
}

export type CompanionStage = 0 | 1 | 2 | 3 | 4;

/** Egg → Hatchling → Sprout → Bloom → Guardian */
export const STAGE_LEVELS: readonly number[] = [1, 3, 6, 10, 15];

export function stageForLevel(level: number): CompanionStage {
  let stage = 0;
  STAGE_LEVELS.forEach((min, i) => {
    if (level >= min) stage = i;
  });
  return stage as CompanionStage;
}
