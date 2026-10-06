import { type ReactNode, useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { motion, transition } from './tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Pressed scale. 0.97 for most controls; cards can go to 0.98. */
  scaleTo?: number;
}

/**
 * Press feedback on press-in, commit on press-out. A 120ms CSS transition on the
 * UI thread — no shared values needed for a two-state change (animate-expo, "Press feedback").
 * Under Reduce Motion the scale becomes a dim instead.
 */
export function PressableScale({ children, style, scaleTo = 0.97, onPressIn, onPressOut, disabled, ...rest }: PressableScaleProps) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  return (
    <AnimatedPressable
      hitSlop={8}
      pressRetentionOffset={16}
      accessibilityRole="button"
      disabled={disabled}
      {...rest}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      style={[
        pressTransition,
        styles.base,
        style,
        pressed && (reduced ? styles.dim : { transform: [{ scale: scaleTo }] }),
        disabled && styles.disabled,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}

const pressTransition = transition(['transform', 'opacity'], motion.press);

const styles = StyleSheet.create({
  base: { transform: [{ scale: 1 }] },
  dim: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
});
