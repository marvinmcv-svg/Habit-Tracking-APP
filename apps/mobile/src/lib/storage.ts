import { Storage } from 'expo-sqlite/kv-store';
import type { StateStorage } from 'zustand/middleware';

/**
 * Native persistence: expo-sqlite's key-value store (a SQLite table on device).
 * The sync API lets the store hydrate before first paint, so Today never flashes empty.
 */
export const appStorage: StateStorage = {
  getItem: (key) => Storage.getItemSync(key),
  setItem: (key, value) => Storage.setItemSync(key, value),
  removeItem: (key) => {
    Storage.removeItemSync(key);
  },
};
