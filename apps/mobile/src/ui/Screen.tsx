import type { ReactNode } from 'react';
import { ScrollView, type ScrollViewProps, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarSpace } from './TabBar';
import { Text } from './Text';
import { useTheme } from './theme';
import { space } from './tokens';

interface ScreenProps extends ScrollViewProps {
  children: ReactNode;
  /** Leave room for the floating tab bar. */
  tabs?: boolean;
}

export function Screen({ children, tabs = true, contentContainerStyle, ...rest }: ScreenProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = useTabBarSpace();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      {...rest}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + space.sm, paddingBottom: tabs ? bottom : insets.bottom + space.xxl },
        contentContainerStyle,
      ]}
    >
      <View style={styles.inner}>{children}</View>
    </ScrollView>
  );
}

export function ScreenHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text variant="footnote" tone="secondary" weight="600" style={[styles.eyebrow, { flex: 1 }]} numberOfLines={1}>
          {eyebrow ?? ''}
        </Text>
        {right}
      </View>
      <Text variant="largeTitle" accessibilityRole="header" numberOfLines={2}>
        {title}
      </Text>
    </View>
  );
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="title3" accessibilityRole="header">
        {children}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, alignItems: 'center' },
  inner: { width: '100%', maxWidth: 560, gap: space.lg },
  header: { gap: 2, marginBottom: -space.xs },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 32 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 0.6 },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm, marginBottom: -space.xs },
});
