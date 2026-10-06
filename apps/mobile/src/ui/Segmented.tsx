import { StyleSheet, View } from 'react-native';

import { haptics } from '../lib/haptics';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { useTheme } from './theme';
import { radius } from './tokens';

interface Props<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

/** iOS-style segmented control. Toggled many times a session, so the change is instant. */
export function Segmented<T extends string>({ value, options, onChange }: Props<T>) {
  const t = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: t.fill }]} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={o.value}
            scaleTo={0.96}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            onPress={() => {
              if (!selected) {
                haptics.selection();
                onChange(o.value);
              }
            }}
            style={[styles.seg, selected && { backgroundColor: t.scheme === 'dark' ? '#636366' : '#FFFFFF', ...styles.shadow }]}
          >
            <Text variant="footnote" weight={selected ? '600' : '500'} numberOfLines={1}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radius.sm, padding: 2, borderCurve: 'continuous' },
  seg: { flex: 1, minHeight: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8, paddingHorizontal: 6 },
  shadow: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
});
