import type { LifetimeTotals } from '../habits/logic/stats';

export type AchievementKey = 'flame' | 'committed' | 'perfectionist' | 'earlyBird' | 'nightOwl' | 'weekend' | 'architect' | 'comeback';

export interface AchievementDef {
  key: AchievementKey;
  emoji: string;
  /** Two-stop gradient for the badge. */
  colors: [string, string];
  tiers: number[];
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'flame', emoji: '🔥', colors: ['#FF9F0A', '#FF453A'], tiers: [3, 7, 14, 30, 60, 100, 200, 365] },
  { key: 'committed', emoji: '✅', colors: ['#30D158', '#00A86B'], tiers: [10, 50, 100, 250, 500, 1000] },
  { key: 'perfectionist', emoji: '💎', colors: ['#64D2FF', '#5E5CE6'], tiers: [1, 5, 15, 30, 100] },
  { key: 'earlyBird', emoji: '🌅', colors: ['#FFD60A', '#FF9F0A'], tiers: [5, 25, 50, 100, 250] },
  { key: 'nightOwl', emoji: '🦉', colors: ['#BF5AF2', '#5E5CE6'], tiers: [5, 25, 50, 100, 250] },
  { key: 'weekend', emoji: '🏖️', colors: ['#40C8E0', '#0A84FF'], tiers: [5, 20, 50, 100] },
  { key: 'architect', emoji: '🧱', colors: ['#FF6482', '#FF2D55'], tiers: [1, 3, 5, 10] },
  { key: 'comeback', emoji: '🌱', colors: ['#63E6BE', '#30D158'], tiers: [1, 3, 5] },
];

export interface AchievementInputs extends LifetimeTotals {
  longestStreak: number;
  habitsCreated: number;
  comebacks: number;
}

export interface AchievementProgress {
  def: AchievementDef;
  value: number;
  /** Number of tiers reached (0 = locked). */
  tier: number;
  /** Threshold of the highest tier reached, or the first tier when locked. */
  shownValue: number;
  next: number | null;
  /** 0…1 toward the next tier. */
  progress: number;
}

function valueFor(key: AchievementKey, i: AchievementInputs): number {
  switch (key) {
    case 'flame':
      return i.longestStreak;
    case 'committed':
      return i.checkins;
    case 'perfectionist':
      return i.perfectDays;
    case 'earlyBird':
      return i.morning;
    case 'nightOwl':
      return i.evening;
    case 'weekend':
      return i.weekend;
    case 'architect':
      return i.habitsCreated;
    case 'comeback':
      return i.comebacks;
  }
}

export function achievementProgress(inputs: AchievementInputs): AchievementProgress[] {
  return ACHIEVEMENTS.map((def) => {
    const value = valueFor(def.key, inputs);
    const tier = def.tiers.filter((t) => value >= t).length;
    const next = tier < def.tiers.length ? def.tiers[tier] : null;
    const prevThreshold = tier === 0 ? 0 : def.tiers[tier - 1];
    const progress = next === null ? 1 : (value - prevThreshold) / (next - prevThreshold);
    return {
      def,
      value,
      tier,
      shownValue: tier === 0 ? def.tiers[0] : def.tiers[tier - 1],
      next,
      progress: Math.max(0, Math.min(1, progress)),
    };
  });
}
