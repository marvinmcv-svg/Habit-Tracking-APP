import { adventureReward, adventureStatus, formatRemaining } from '../adventures';

describe('adventures', () => {
  const adv = { id: 'a', startedAt: '2026-10-06T08:00:00.000Z', endsAt: '2026-10-06T16:00:00.000Z', reward: { coins: 30 }, destination: 0 };

  it('reports idle, away with progress, and ready', () => {
    expect(adventureStatus(null, 0)).toEqual({ kind: 'idle' });
    const mid = adventureStatus(adv, Date.parse('2026-10-06T12:00:00Z'));
    expect(mid).toEqual({ kind: 'away', remainingMs: 4 * 3600e3, progress: 0.5 });
    expect(adventureStatus(adv, Date.parse('2026-10-06T16:00:00Z'))).toEqual({ kind: 'ready' });
  });

  it('scales rewards with growth and formats time', () => {
    expect([0, 2, 4].map((s) => adventureReward(s as 0 | 2 | 4).coins)).toEqual([30, 50, 70]);
    expect(formatRemaining(4 * 3600e3 + 5 * 60e3)).toBe('4h 05m');
    expect(formatRemaining(59e3)).toBe('1m');
  });
});
