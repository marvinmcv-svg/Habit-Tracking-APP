import { Ionicons } from '@expo/vector-icons';
import { Children, type ComponentProps, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { useTheme } from './theme';
import { radius, space } from './tokens';

/** iOS inset-grouped list section. */
export function ListGroup({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const t = useTheme();
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: 6 }}>
      {title ? (
        <Text variant="footnote" tone="secondary" style={styles.groupTitle}>
          {title}
        </Text>
      ) : null}
      <View style={[styles.group, { backgroundColor: t.card }]}>
        {items.map((child, i) => (
          <View key={i}>
            {child}
            {i < items.length - 1 ? <View style={[styles.sep, { backgroundColor: t.separator }]} /> : null}
          </View>
        ))}
      </View>
      {footer ? (
        <Text variant="footnote" tone="secondary" style={styles.groupFooter}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

interface RowProps {
  icon?: ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  children?: ReactNode;
}

export function ListRow({ icon, iconColor, label, value, onPress, right, destructive, children }: RowProps) {
  const t = useTheme();
  const content = (
    <View style={styles.row}>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: iconColor ?? t.accent }]}>
          <Ionicons name={icon} size={17} color="#FFF" />
        </View>
      ) : null}
      <Text variant="body" color={destructive ? t.danger : undefined} style={{ flex: 1 }} numberOfLines={1}>
        {label}
      </Text>
      {value ? (
        <Text variant="body" tone="secondary" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {right}
      {onPress && !right ? <Ionicons name="chevron-forward" size={18} color={t.textTertiary} /> : null}
    </View>
  );
  return (
    <View>
      {onPress ? (
        <PressableScale scaleTo={0.99} onPress={onPress} accessibilityLabel={label}>
          {content}
        </PressableScale>
      ) : (
        content
      )}
      {children ? <View style={styles.extra}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  groupTitle: { paddingHorizontal: space.lg, textTransform: 'uppercase', letterSpacing: 0.3 },
  groupFooter: { paddingHorizontal: space.lg },
  group: { borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 56 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, paddingHorizontal: space.lg, paddingVertical: 10 },
  icon: { width: 30, height: 30, borderRadius: 8, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  extra: { paddingHorizontal: space.lg, paddingBottom: space.md },
});
