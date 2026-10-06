import { StyleSheet, View } from 'react-native';

import { Text } from '../../ui/Text';
import { useTheme } from '../../ui/theme';

/** Horizontal bar with the label above and the value at the tip — text stays in text colours. */
export function HBar({ label, value, color, leading }: { label: string; value: number; color: string; leading?: React.ReactNode }) {
  const t = useTheme();
  const pct = Math.round(value * 100);
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${pct}%`}>
      <View style={styles.labelRow}>
        {leading}
        <Text variant="subhead" numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Text>
        <Text variant="subhead" weight="600" tabular>
          {pct}%
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: t.fill }]}>
        <View style={[styles.fill, { width: `${Math.max(value > 0 ? 2 : 0, pct)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
});
