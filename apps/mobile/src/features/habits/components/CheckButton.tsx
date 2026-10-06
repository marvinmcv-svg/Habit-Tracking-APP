import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { PressableScale } from '../../../ui/PressableScale';
import { ProgressRing } from '../../../ui/ProgressRing';
import { Text } from '../../../ui/Text';
import { useTheme } from '../../../ui/theme';
import { motion, transition, withAlpha } from '../../../ui/tokens';

interface Props {
  color: string;
  progress: number;
  /** Show a "+" inside the ring for stepped habits that aren't done yet. */
  stepped: boolean;
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  size?: number;
}

/**
 * The one-tap logger. Tapped tens of times a day, so its motion stays under 150ms:
 * the fill colour and the check's scale/opacity transition together.
 */
export function CheckButton({ color, progress, stepped, label, onPress, onLongPress, size = 44 }: Props) {
  const t = useTheme();
  const done = progress >= 1;
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      scaleTo={0.9}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
      style={{ width: size, height: size }}
    >
      {stepped && !done ? (
        <ProgressRing size={size} stroke={4} progress={progress} colors={[color, color]} trackColor={withAlpha(color, 0.18)}>
          <Ionicons name="add" size={size * 0.48} color={color} />
        </ProgressRing>
      ) : (
        <Animated.View
          style={[
            colorTransition,
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: done ? color : withAlpha(color, 0.35),
              backgroundColor: done ? color : t.scheme === 'dark' ? withAlpha(color, 0.12) : withAlpha(color, 0.08),
            },
          ]}
        >
          <Animated.View style={[checkTransition, done ? styles.checkOn : styles.checkOff]}>
            <Ionicons name="checkmark" size={size * 0.55} color="#FFFFFF" />
          </Animated.View>
        </Animated.View>
      )}
    </PressableScale>
  );
}

export function StatPill({ icon, text, color }: { icon: React.ReactNode; text: string; color?: string }) {
  const t = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: t.fill }]}>
      {icon}
      <Text variant="footnote" weight="700" color={color} tabular>
        {text}
      </Text>
    </View>
  );
}

const colorTransition = transition(['backgroundColor', 'borderColor'], motion.small);
const checkTransition = transition(['opacity', 'transform'], motion.small);

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  checkOn: { opacity: 1, transform: [{ scale: 1 }] },
  checkOff: { opacity: 0, transform: [{ scale: 0.6 }] },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 30, borderRadius: 15 },
});
