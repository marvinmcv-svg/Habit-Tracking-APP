import { useId } from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useTheme } from './theme';

interface Props {
  emoji: string;
  colors: [string, string];
  value: number | string;
  locked?: boolean;
  size?: number;
}

const SHIELD = 'M50 3 L90 22 Q95 25 95 31 L95 66 Q95 72 90 76 L54 97 Q50 99 46 97 L10 76 Q5 72 5 66 L5 31 Q5 25 10 22 Z';

/** Achievement badge: a gem-like shield, emoji crest and the tier number stamped on the bottom. */
export function Badge({ emoji, colors, value, locked, size = 84 }: Props) {
  const t = useTheme();
  const [a, b] = locked ? (t.scheme === 'dark' ? ['#3A3A3C', '#2C2C2E'] : ['#E5E5EA', '#D1D1D6']) : colors;
  const id = `badge${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={a} />
            <Stop offset="1" stopColor={b} />
          </LinearGradient>
          <LinearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={locked ? 0.15 : 0.45} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={SHIELD} fill={`url(#${id})`} />
        <Path d="M50 9 L86 26 Q89 28 89 32 L89 48 Q50 40 11 48 L11 32 Q11 28 14 26 Z" fill={`url(#${id}-shine)`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <RNText style={{ fontSize: size * 0.32, lineHeight: size * 0.4, marginTop: -size * 0.2, opacity: locked ? 0.35 : 1 }}>
          {emoji}
        </RNText>
      </View>
      <View style={styles.valueWrap}>
        <RNText
          style={[
            styles.value,
            {
              fontSize: String(value).length > 3 ? size * 0.19 : size * 0.24,
              color: locked ? t.textTertiary : '#FFFFFF',
              textShadowColor: locked ? 'transparent' : 'rgba(0,0,0,0.28)',
            },
          ]}
        >
          {value}
        </RNText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  valueWrap: { position: 'absolute', left: 0, right: 0, bottom: '12%', alignItems: 'center' },
  value: { fontWeight: '900', textShadowOffset: { width: 0, height: 1.5 }, textShadowRadius: 0, fontVariant: ['tabular-nums'] },
});
