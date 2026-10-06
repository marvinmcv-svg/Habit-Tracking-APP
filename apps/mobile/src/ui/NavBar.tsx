import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { useTheme } from './theme';
import { space } from './tokens';

export function CircleButton({
  icon,
  onPress,
  label,
  color,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  label: string;
  color?: string;
}) {
  const t = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} scaleTo={0.9} style={[styles.circle, { backgroundColor: t.fill }]}>
      <Ionicons name={icon} size={20} color={color ?? t.text} />
    </PressableScale>
  );
}

/** Compact top bar for pushed screens and modals. */
export function NavBar({ title, left, right, modal }: { title?: string; left?: ReactNode; right?: ReactNode; modal?: boolean }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <View style={[styles.bar, { paddingTop: modal ? space.md : insets.top + space.xs }]}>
      <View style={styles.side}>
        {left ?? (
          <CircleButton
            icon={modal ? 'close' : 'chevron-back'}
            label={modal ? t('common.close') : t('common.back')}
            onPress={() => router.back()}
          />
        )}
      </View>
      <Text variant="headline" numberOfLines={1} style={styles.title}>
        {title ?? ''}
      </Text>
      <View style={[styles.side, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingBottom: space.sm, gap: space.sm },
  side: { minWidth: 88 },
  title: { flex: 1, textAlign: 'center' },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
