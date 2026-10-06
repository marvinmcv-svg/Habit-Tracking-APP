import { addDays, today } from '../logic/dates';
import { coinBalance, useHabitStore } from '../store';

jest.mock('../../../lib/storage', () => {
  const mem = new Map<string, string>();
  return {
    appStorage: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    },
  };
});

const draft = {
  name: 'Read',
  emoji: '📚',
  color: 'indigo' as const,
  type: 'boolean' as const,
  target: 1,
  schedule: { kind: 'daily' as const },
  timeOfDay: 'evening' as const,
  reminderTime: null,
};

beforeEach(() => useHabitStore.getState().resetAll());

describe('habit store', () => {
  it('creates habits and toggles a one-tap check-in', () => {
    const h = useHabitStore.getState().addHabit(draft);
    const d = today();
    useHabitStore.getState().tapCheckIn(h.id);
    expect(useHabitStore.getState().logs[h.id][d]).toBe(1);
    useHabitStore.getState().tapCheckIn(h.id);
    expect(useHabitStore.getState().logs[h.id][d]).toBeUndefined();
  });

  it('steps count habits up to the target', () => {
    const h = useHabitStore.getState().addHabit({ ...draft, type: 'count', target: 3 });
    for (let i = 0; i < 5; i++) useHabitStore.getState().tapCheckIn(h.id);
    // 3 taps reach the target, the 4th resets, the 5th starts again.
    expect(useHabitStore.getState().logs[h.id][today()]).toBe(1);
  });

  it('celebrates the first completion of the day, once', () => {
    const a = useHabitStore.getState().addHabit({ ...draft, startDate: addDays(today(), -10) });
    const b = useHabitStore.getState().addHabit({ ...draft, name: 'Walk', startDate: addDays(today(), -10) });
    useHabitStore.getState().setLog(a.id, addDays(today(), -1), 1);
    expect(useHabitStore.getState().celebration).toBeNull(); // history edits stay quiet

    useHabitStore.getState().tapCheckIn(a.id);
    expect(useHabitStore.getState().celebration).toEqual({ kind: 'streak', streak: 2, earnedFreeze: false, perfect: false });
    useHabitStore.getState().dismissCelebration();

    useHabitStore.getState().tapCheckIn(b.id);
    expect(useHabitStore.getState().celebration).toEqual({ kind: 'perfect' });
  });

  it('awards a freeze on every 7th streak day', () => {
    const h = useHabitStore.getState().addHabit({ ...draft, startDate: addDays(today(), -10) });
    useHabitStore.setState({ freezes: 0 });
    for (let i = 1; i <= 6; i++) useHabitStore.getState().setLog(h.id, addDays(today(), -i), 1);
    useHabitStore.getState().tapCheckIn(h.id);
    const s = useHabitStore.getState();
    expect(s.celebration).toMatchObject({ kind: 'streak', streak: 7, earnedFreeze: true });
    expect(s.freezes).toBe(1);
  });

  it('spends freezes on launch to protect the streak', () => {
    const h = useHabitStore.getState().addHabit({ ...draft, startDate: addDays(today(), -10) });
    for (let i = 3; i <= 5; i++) useHabitStore.getState().setLog(h.id, addDays(today(), -i), 1);
    useHabitStore.setState({ freezes: 2, lastDailyCheck: null });
    useHabitStore.getState().runDailyCheck();
    const s = useHabitStore.getState();
    expect(s.freezes).toBe(0);
    expect(s.frozenDates).toEqual([addDays(today(), -2), addDays(today(), -1)]);
    expect(s.celebration).toMatchObject({ kind: 'freezeUsed', days: 2, streak: 3 });
    // Only once per day.
    useHabitStore.getState().dismissCelebration();
    useHabitStore.getState().runDailyCheck();
    expect(useHabitStore.getState().celebration).toBeNull();
  });

  it('offers a comeback when the streak breaks, and repair restores it', () => {
    const h = useHabitStore.getState().addHabit({ ...draft, startDate: addDays(today(), -20) });
    // Plenty of history so there are coins to spend.
    for (let i = 3; i <= 17; i++) useHabitStore.getState().setLog(h.id, addDays(today(), -i), 1);
    useHabitStore.setState({ freezes: 0, lastDailyCheck: null });
    useHabitStore.getState().runDailyCheck();
    expect(useHabitStore.getState().comeback).toEqual({ key: addDays(today(), -3), lostStreak: 15, missedDays: 2 });

    expect(useHabitStore.getState().repairStreak()).toBe(true);
    const s = useHabitStore.getState();
    expect(s.comeback).toBeNull();
    expect(s.frozenDates).toEqual([addDays(today(), -2), addDays(today(), -1)]);
  });

  it('start fresh dismisses the comeback for good and counts it', () => {
    const h = useHabitStore.getState().addHabit({ ...draft, startDate: addDays(today(), -20) });
    useHabitStore.getState().setLog(h.id, addDays(today(), -5), 1);
    useHabitStore.setState({ freezes: 0, lastDailyCheck: null });
    useHabitStore.getState().runDailyCheck();
    useHabitStore.getState().startFresh();
    useHabitStore.setState({ lastDailyCheck: null });
    useHabitStore.getState().runDailyCheck();
    expect(useHabitStore.getState().comeback).toBeNull();
    expect(useHabitStore.getState().comebacks).toBe(1);
  });

  it('only sells freezes with enough coins and room', () => {
    useHabitStore.setState({ freezes: 0 });
    expect(useHabitStore.getState().buyFreeze()).toBe(false);
  });

  it('runs an 8-hour adventure that survives restarts and pays out once', () => {
    const h = useHabitStore.getState().addHabit(draft);
    const t0 = Date.parse('2026-10-06T08:00:00Z');
    expect(useHabitStore.getState().startAdventure(t0)).toBeNull(); // locked until today is secured
    useHabitStore.getState().tapCheckIn(h.id);
    useHabitStore.getState().dismissCelebration();
    const adv = useHabitStore.getState().startAdventure(t0)!;
    expect(adv.endsAt).toBe('2026-10-06T16:00:00.000Z');
    expect(useHabitStore.getState().startAdventure(t0)).toBeNull(); // one at a time

    // Persisted as wall-clock timestamps, so a "restart" (fresh read) sees the same state.
    expect(useHabitStore.getState().claimAdventure(t0 + 7.9 * 3600e3)).toBe(false);
    const before = coinBalance(useHabitStore.getState());
    expect(useHabitStore.getState().claimAdventure(t0 + 8 * 3600e3)).toBe(true);
    const s = useHabitStore.getState();
    expect(coinBalance(s)).toBe(before + adv.reward.coins);
    expect(s.celebration).toMatchObject({ kind: 'adventure', coins: adv.reward.coins });
    expect(s.adventure).toBeNull();
    expect(useHabitStore.getState().claimAdventure(t0 + 9 * 3600e3)).toBe(false);
  });

  it('buys and equips cosmetics only with enough coins', () => {
    expect(useHabitStore.getState().buyItem('bowtie')).toBe(false);
    useHabitStore.setState({ coinsBonus: 100 });
    expect(useHabitStore.getState().buyItem('bowtie')).toBe(true);
    let s = useHabitStore.getState();
    expect(s.inventory).toEqual(['bowtie']);
    expect(s.equipped.accessory).toBe('bowtie');
    expect(coinBalance(s)).toBe(40);
    expect(useHabitStore.getState().buyItem('bowtie')).toBe(false); // already owned
    useHabitStore.getState().equipItem(null, 'accessory');
    useHabitStore.getState().equipItem('crown', 'hat'); // not owned → ignored
    s = useHabitStore.getState();
    expect(s.equipped).toEqual({ hat: null, accessory: null });
  });

  it('stamps every log write and tombstones deletes for sync', () => {
    const h = useHabitStore.getState().addHabit(draft);
    useHabitStore.getState().tapCheckIn(h.id);
    expect(Object.keys(useHabitStore.getState().logStamps)).toEqual([`${h.id}|${today()}`]);
    useHabitStore.getState().deleteHabit(h.id);
    expect(Object.keys(useHabitStore.getState().habitTombstones)).toEqual([h.id]);
  });
});
