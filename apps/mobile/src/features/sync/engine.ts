import type { SupabaseClient } from '@supabase/supabase-js';
import { create } from 'zustand';

import { track } from '../../lib/analytics';
import { supabase } from '../../lib/supabase';
import { useHabitStore } from '../habits/store';
import { type FreezeRow, type HabitRow, type LogRow, type PullSet, applyPull, collectPush, maxSyncedAt } from './merge';

export type SyncPhase = 'disabled' | 'signedOut' | 'idle' | 'syncing' | 'error';

interface SyncStatus {
  phase: SyncPhase;
  email: string | null;
  lastSyncedAt: string | null;
  error: string | null;
}

export const useSyncStatus = create<SyncStatus>(() => ({
  phase: supabase ? 'signedOut' : 'disabled',
  email: null,
  lastSyncedAt: null,
  error: null,
}));

const PAGE = 1000;

async function pullTable<T extends { synced_at?: string }>(sb: SupabaseClient, table: string, since: string | null): Promise<T[]> {
  const out: T[] = [];
  let cursor = since;
  for (;;) {
    let q = sb.from(table).select('*').order('synced_at', { ascending: true }).limit(PAGE);
    if (cursor) q = q.gt('synced_at', cursor);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) return out;
    cursor = rows[rows.length - 1].synced_at ?? cursor;
  }
}

let inFlight: Promise<void> | null = null;
/** True while the engine writes merged remote data, so the change listener doesn't re-trigger a sync. */
export let applyingRemote = false;

/** Push local changes, then pull remote ones. Concurrent calls share one run. */
export function syncNow(): Promise<void> {
  if (!inFlight) inFlight = run().finally(() => (inFlight = null));
  return inFlight;
}

async function run() {
  const sb = supabase;
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  const session = data.session;
  if (!session) {
    useSyncStatus.setState({ phase: 'signedOut', email: null });
    return;
  }
  useSyncStatus.setState({ phase: 'syncing', email: session.user.email ?? null, error: null });
  try {
    await syncWith(sb, session.user.id);
    useSyncStatus.setState({ phase: 'idle', lastSyncedAt: new Date().toISOString() });
  } catch (e) {
    const message = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
    useSyncStatus.setState({ phase: 'error', error: message });
    track('sync_failed');
  }
}

/** One push+pull round against any client. Throws on failure; exported for the end-to-end test. */
export async function syncWith(sb: SupabaseClient, userId: string) {
  const startedAt = new Date().toISOString();
  const state = useHabitStore.getState();
  const push = collectPush(state, state.lastPushedAt, userId);
  // Habits first so log foreign keys resolve.
  if (push.habits.length) {
    const { error } = await sb.from('habits').upsert(push.habits);
    if (error) throw error;
  }
  for (const t of push.tombstones) {
    const { error } = await sb.from('habits').update({ deleted_at: t.deleted_at, updated_at: t.deleted_at }).eq('id', t.id);
    if (error) throw error;
  }
  if (push.logs.length) {
    const { error } = await sb.from('habit_logs').upsert(push.logs, { onConflict: 'habit_id,user_id,local_date' });
    if (error) throw error;
  }
  if (push.freezes.length) {
    const { error } = await sb.from('streak_freezes').upsert(push.freezes, { onConflict: 'user_id,local_date', ignoreDuplicates: true });
    if (error) throw error;
  }

  const since = state.lastPulledAt;
  const pulled: PullSet = {
    habits: await pullTable<HabitRow>(sb, 'habits', since),
    logs: await pullTable<LogRow>(sb, 'habit_logs', since),
    freezes: await pullTable<FreezeRow>(sb, 'streak_freezes', since),
  };

  // Merge against the *latest* local state: the user may have tapped while we were away.
  const latest = useHabitStore.getState();
  const hasRemote = pulled.habits.length + pulled.logs.length + pulled.freezes.length > 0;
  applyingRemote = true;
  try {
    useHabitStore.setState({
      ...(hasRemote ? applyPull(latest, pulled) : null),
      lastPushedAt: startedAt,
      lastPulledAt: maxSyncedAt(pulled, since),
    });
  } finally {
    applyingRemote = false;
  }
  track('sync_completed', { pushed: push.habits.length + push.logs.length, pulled: pulled.habits.length + pulled.logs.length });
}

// ----------------------------------------------------------------- auth

export async function sendSignInCode(email: string) {
  if (!supabase) throw new Error('Cloud sync is not configured');
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifySignInCode(email: string, token: string) {
  if (!supabase) throw new Error('Cloud sync is not configured');
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
  track('signed_in');
  await syncNow();
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
  // Local data stays on the device; the next sign-in re-pushes everything.
  useHabitStore.setState({ lastPulledAt: null, lastPushedAt: null });
  useSyncStatus.setState({ phase: 'signedOut', email: null, lastSyncedAt: null });
  track('signed_out');
}

/** Store-policy account deletion: removes the server account and all its rows, then local data. */
export async function deleteAccount() {
  if (!supabase) return;
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
  await supabase.auth.signOut();
  useHabitStore.getState().resetAll();
  useSyncStatus.setState({ phase: 'signedOut', email: null, lastSyncedAt: null });
  track('account_deleted');
}
