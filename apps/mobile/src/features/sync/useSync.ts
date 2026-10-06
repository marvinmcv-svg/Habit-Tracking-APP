import { useEffect } from 'react';
import { AppState } from 'react-native';

import { identifyPurchaser } from '../../lib/purchases';
import { supabase } from '../../lib/supabase';
import { useHabitStore } from '../habits/store';
import * as engine from './engine';
import { syncNow, useSyncStatus } from './engine';

const DEBOUNCE_MS = 4000;

/** Background sync: on launch, on sign-in, on foreground, and a few seconds after local edits. */
export function useBackgroundSync() {
  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void syncNow(), DEBOUNCE_MS);
    };

    sb.auth.getSession().then(({ data }) => {
      useSyncStatus.setState({ phase: data.session ? 'idle' : 'signedOut', email: data.session?.user.email ?? null });
      if (data.session) void syncNow();
    });
    const { data: authSub } = sb.auth.onAuthStateChange((_event, session) => {
      void identifyPurchaser(session?.user.id ?? null);
      useSyncStatus.setState((s) => ({
        email: session?.user.email ?? null,
        phase: session ? (s.phase === 'syncing' ? 'syncing' : 'idle') : 'signedOut',
      }));
    });
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNow();
    });
    const unsub = useHabitStore.subscribe((s, prev) => {
      if (engine.applyingRemote) return;
      if (
        s.habits !== prev.habits ||
        s.logs !== prev.logs ||
        s.frozenDates !== prev.frozenDates ||
        s.habitTombstones !== prev.habitTombstones
      ) {
        if (useSyncStatus.getState().phase !== 'signedOut') schedule();
      }
    });
    return () => {
      if (timer) clearTimeout(timer);
      authSub.subscription.unsubscribe();
      appSub.remove();
      unsub();
    };
  }, []);
}
