import type { StateStorage } from 'zustand/middleware';

/** Web preview persistence. The shipping targets are iOS and Android (see storage.ts). */
export const appStorage: StateStorage = {
  getItem: (key) => {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Storage can be unavailable (private mode); the app still works in memory.
    }
  },
  removeItem: (key) => {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // ignore
    }
  },
};
