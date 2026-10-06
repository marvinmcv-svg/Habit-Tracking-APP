import type { ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from './theme';
import { radius, space } from './tokens';

export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: t.card,
          shadowColor: t.scheme === 'dark' ? '#000' : '#1B1150',
          borderColor: t.scheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
        },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export const cardShadow = {
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.07,
  shadowRadius: 18,
  elevation: 2,
} as const;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    ...cardShadow,
  },
  padded: { padding: space.lg },
});
