import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { ActivityIndicator, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { useTheme } from './theme';
import { radius } from './tokens';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'plain' | 'destructive';
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Solid color override (e.g. a habit's color). */
  color?: string;
  size?: 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  color,
  size = 'lg',
  disabled,
  loading,
  style,
  accessibilityHint,
}: ButtonProps) {
  const t = useTheme();
  const height = size === 'lg' ? 54 : 44;
  const fg =
    variant === 'primary' || variant === 'destructive' ? '#FFFFFF' : variant === 'plain' ? (color ?? t.accent) : (color ?? t.accent);
  const content = (
    <View style={styles.row}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={size === 'lg' ? 20 : 18} color={fg} /> : null}
      <Text variant={size === 'lg' ? 'headline' : 'subhead'} weight="600" color={fg}>
        {label}
      </Text>
    </View>
  );

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={[{ height, borderRadius: radius.pill, overflow: 'hidden' }, style]}
    >
      {variant === 'primary' && !color ? (
        <LinearGradient colors={t.accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.fill,
            {
              backgroundColor:
                variant === 'primary' ? color : variant === 'destructive' ? t.danger : variant === 'secondary' ? t.fill : 'transparent',
            },
          ]}
        >
          {content}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
