import type { CompanionStage } from './progression';

export const ADVENTURE_HOURS = 8;
export const ADVENTURE_MS = ADVENTURE_HOURS * 60 * 60 * 1000;

export interface Adventure {
  id: string;
  /** ISO timestamps — wall-clock based so the timer survives app kills and reboots. */
  startedAt: string;
  endsAt: string;
  reward: { coins: number };
  /** Index into the destination list, for copy and art. */
  destination: number;
}

export const DESTINATIONS = ['🏔️', '🌊', '🌲', '🏜️', '🌋', '🏝️'] as const;

export type AdventureStatus = { kind: 'idle' } | { kind: 'away'; remainingMs: number; progress: number } | { kind: 'ready' };

export function adventureStatus(adv: Adventure | null, now: number): AdventureStatus {
  if (!adv) return { kind: 'idle' };
  const start = Date.parse(adv.startedAt);
  const end = Date.parse(adv.endsAt);
  if (now >= end) return { kind: 'ready' };
  return { kind: 'away', remainingMs: end - now, progress: Math.max(0, Math.min(1, (now - start) / (end - start))) };
}

/** Bigger companions bring back more. */
export function adventureReward(stage: CompanionStage): { coins: number } {
  return { coins: 30 + stage * 10 };
}

export function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 60000);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`;
}
