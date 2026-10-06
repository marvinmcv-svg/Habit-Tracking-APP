import { type ReactNode, useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useTheme } from './theme';
import { motion } from './tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  size: number;
  stroke: number;
  progress: number;
  colors?: [string, string];
  trackColor?: string;
  children?: ReactNode;
}

/** State indication: the ring eases to the new value (ease-out, 360ms) on the UI thread. */
export function ProgressRing({ size, stroke, progress, colors, trackColor, children }: Props) {
  const t = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = useSharedValue(0);
  const [from, to] = colors ?? t.accentGradient;
  const id = `ring${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  useEffect(() => {
    p.set(withTiming(Math.max(0, Math.min(1, progress)), { duration: 360, easing: motion.easeOut, reduceMotion: ReduceMotion.System }));
  }, [progress, p]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.get()) }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor ?? t.fill} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
