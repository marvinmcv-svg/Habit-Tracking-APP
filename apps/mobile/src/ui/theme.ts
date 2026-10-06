import { useColorScheme } from 'react-native';

import { useHabitStore } from '../features/habits/store';
import { type Theme, themes } from './tokens';

export function useTheme(): Theme {
  const pref = useHabitStore((s) => s.settings.theme);
  const system = useColorScheme();
  const scheme = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  return themes[scheme];
}
