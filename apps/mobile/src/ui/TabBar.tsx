import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { ComponentProps } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Tabs } from 'expo-router/js-tabs';

import { haptics } from '../lib/haptics';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { useTheme } from './theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
type IconName = ComponentProps<typeof Ionicons>['name'];

export const TAB_BAR_HEIGHT = 64;

/** Space screens leave at the bottom so content clears the floating bar. */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, 12) + 24;
}

const ICONS: Record<string, [IconName, IconName]> = {
  index: ['sunny-outline', 'sunny'],
  habits: ['checkmark-circle-outline', 'checkmark-circle'],
  awards: ['trophy-outline', 'trophy'],
  profile: ['person-circle-outline', 'person-circle'],
};

/**
 * Floating, translucent tab bar. Tabs are peers, so switching is instant —
 * no slide, no fade (animate-expo: "Tab switches never slide").
 */
export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // Android's BlurView is costly and inconsistent; a solid translucent fill reads the same.
  const useBlur = Platform.OS === 'ios' || Platform.OS === 'web';

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]}>
      <View style={[styles.bar, { borderColor: t.separator, shadowColor: t.scheme === 'dark' ? '#000' : '#1B1150' }]}>
        {useBlur ? (
          <BlurView
            intensity={60}
            tint={t.scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: useBlur ? t.tabBar : t.bgElevated }]} />
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const [outline, filled] = ICONS[route.name] ?? ['ellipse-outline', 'ellipse'];
          const color = focused ? t.accent : t.textSecondary;
          return (
            <PressableScale
              key={route.key}
              scaleTo={0.92}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  haptics.selection();
                  navigation.navigate(route.name, route.params);
                }
              }}
              style={[styles.item, focused && { backgroundColor: t.accentSoft }]}
            >
              <Ionicons name={focused ? filled : outline} size={24} color={color} />
              <Text variant="caption2" color={color} weight={focused ? '700' : '600'} numberOfLines={1}>
                {label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 16 },
  bar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 480,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderCurve: 'continuous',
    padding: 6,
    gap: 4,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 26, borderCurve: 'continuous' },
});
