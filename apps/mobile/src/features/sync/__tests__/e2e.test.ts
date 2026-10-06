/**
 * End-to-end sync against a real Postgres + PostgREST with the repo's migrations applied.
 * Skipped unless SYNC_E2E_URL (Supabase-style base URL) and SYNC_E2E_JWT_SECRET are set.
 * See docs/ARCHITECTURE.md → "Testing sync locally".
 */
import { createHmac, randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import { addDays, today } from '../../habits/logic/dates';
import { useHabitStore } from '../../habits/store';
import { syncWith } from '../engine';

jest.mock('../../../lib/supabase', () => ({ supabase: null, cloudEnabled: false }));
jest.mock('../../../lib/storage', () => ({ appStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } }));

const URL = process.env.SYNC_E2E_URL;
const SECRET = process.env.SYNC_E2E_JWT_SECRET;
const run = URL && SECRET ? describe : describe.skip;

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
function jwt(sub: string) {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ sub, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 });
  const sig = createHmac('sha256', SECRET!).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}
const clientFor = (userId: string) => createClient(URL!, 'anon', { accessToken: async () => jwt(userId) });

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
type Snapshot = ReturnType<typeof useHabitStore.getState>;
const snapshot = (): Snapshot => ({ ...useHabitStore.getState() });
const restore = (s: Snapshot) => useHabitStore.setState(s, true);
const tick = () => new Promise((r) => setTimeout(r, 5));

run('sync end-to-end', () => {
  const userA = randomUUID();
  const userB = randomUUID();
  const d = today();
  const y = addDays(d, -1);

  beforeAll(async () => {
    // The harness's /admin endpoint creates auth.users rows (normally GoTrue's job).
    for (const id of [userA, userB]) {
      const res = await fetch(`${URL}/admin/users`, { method: 'POST', body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error(`create user: ${res.status}`);
    }
  });

  it('two devices converge, last write wins, deletes propagate, users stay isolated', async () => {
    const sb = clientFor(userA);

    // Device 1: create two habits and log.
    useHabitStore.getState().resetAll();
    const read = useHabitStore.getState().addHabit({ ...draft, startDate: addDays(d, -5) });
    const walk = useHabitStore.getState().addHabit({ ...draft, name: 'Walk', startDate: addDays(d, -5) });
    useHabitStore.getState().setLog(read.id, y, 1);
    useHabitStore.getState().setLog(walk.id, d, 1);
    await syncWith(sb, userA);
    const device1 = snapshot();

    // Device 2: fresh install, signs into the same account.
    useHabitStore.getState().resetAll();
    await syncWith(sb, userA);
    let s = useHabitStore.getState();
    expect(s.habits.map((h) => h.name).sort()).toEqual(['Read', 'Walk']);
    expect(s.logs[read.id][y]).toBe(1);
    expect(s.logs[walk.id][d]).toBe(1);

    // Device 2 renames Read, un-logs Walk, deletes nothing.
    await tick();
    useHabitStore.getState().updateHabit(read.id, { name: 'Read 20 min' });
    useHabitStore.getState().setLog(walk.id, d, 0);
    await syncWith(sb, userA);
    const device2 = snapshot();

    // Device 1 comes back: receives both changes.
    restore(device1);
    await syncWith(sb, userA);
    s = useHabitStore.getState();
    expect(s.habits.find((h) => h.id === read.id)?.name).toBe('Read 20 min');
    expect(s.logs[walk.id]?.[d]).toBeUndefined();

    // Device 1 deletes Walk; device 2 picks up the delete.
    useHabitStore.getState().deleteHabit(walk.id);
    await syncWith(sb, userA);
    restore(device2);
    await syncWith(sb, userA);
    s = useHabitStore.getState();
    expect(s.habits.map((h) => h.id)).toEqual([read.id]);

    // A stale write (older client stamp) is ignored by the server.
    const stale = { ...s.habits[0], name: 'STALE', updatedAt: '2000-01-01T00:00:00.000Z' };
    const { error } = await sb.from('habits').upsert({
      id: stale.id,
      user_id: userA,
      name: 'STALE',
      icon: '📚',
      color: 'indigo',
      type: 'boolean',
      updated_at: stale.updatedAt,
    });
    expect(error).toBeNull();
    const { data } = await sb.from('habits').select('name').eq('id', read.id).single();
    expect(data?.name).toBe('Read 20 min');

    // Another user sees nothing of A's.
    const other = await clientFor(userB).from('habits').select('id');
    expect(other.data).toEqual([]);
  });
});
