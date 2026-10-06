import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Companion } from '../features/gamification/Companion';
import { type ItemSlot, SHOP_ITEMS, itemByKey } from '../features/gamification/shop';
import { useProgress } from '../features/gamification/useProgress';
import { useHabitStore } from '../features/habits/store';
import { StatPill } from '../features/habits/components/CheckButton';
import { haptics } from '../lib/haptics';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { NavBar } from '../ui/NavBar';
import { PressableScale } from '../ui/PressableScale';
import { Screen } from '../ui/Screen';
import { Segmented } from '../ui/Segmented';
import { Text } from '../ui/Text';
import { useTheme } from '../ui/theme';
import { radius, space } from '../ui/tokens';

export default function ShopScreen() {
  const th = useTheme();
  const { t } = useTranslation();
  const p = useProgress();
  const inventory = useHabitStore((s) => s.inventory);
  const equipped = useHabitStore((s) => s.equipped);
  const [slot, setSlot] = useState<ItemSlot>('hat');
  const [preview, setPreview] = useState<string | null>(equipped.hat);

  const item = itemByKey(preview);
  const shown = item ? { ...equipped, [item.slot]: item.key } : equipped;
  const owned = item ? inventory.includes(item.key) : false;
  const wearing = item ? equipped[item.slot] === item.key : false;

  const action = () => {
    if (!item) return;
    const s = useHabitStore.getState();
    if (!owned) {
      if (s.buyItem(item.key)) haptics.success();
      else haptics.warning();
    } else {
      haptics.selection();
      s.equipItem(wearing ? null : item.key, item.slot);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: th.bg }}>
      <NavBar title={t('shop.title')} right={<StatPill icon={<Text style={{ fontSize: 14 }}>🪙</Text>} text={String(p.coins)} />} />
      <Screen tabs={false} contentContainerStyle={{ paddingTop: space.sm }}>
        <Card style={styles.stage}>
          <Companion stage={p.stage} happy size={170} equipped={shown} />
          <Text variant="title3">{item ? t(`shop.item.${item.key}`) : t('shop.pick')}</Text>
          {item ? (
            <Button
              label={!owned ? t('shop.buy', { price: item.price }) : wearing ? t('shop.takeOff') : t('shop.wear')}
              icon={!owned ? 'bag-handle' : wearing ? 'close' : 'checkmark'}
              variant={owned && wearing ? 'secondary' : 'primary'}
              disabled={!owned && p.coins < item.price}
              onPress={action}
              style={{ alignSelf: 'stretch' }}
            />
          ) : null}
          {item && !owned && p.coins < item.price ? (
            <Text variant="footnote" tone="secondary" align="center">
              {t('shop.needMore', { count: item.price - p.coins })}
            </Text>
          ) : null}
        </Card>

        <Segmented<ItemSlot>
          value={slot}
          onChange={setSlot}
          options={[
            { value: 'hat', label: t('shop.hats') },
            { value: 'accessory', label: t('shop.accessories') },
          ]}
        />
        <View style={styles.grid}>
          {SHOP_ITEMS.filter((i) => i.slot === slot).map((i) => {
            const have = inventory.includes(i.key);
            const on = equipped[i.slot] === i.key;
            const sel = preview === i.key;
            return (
              <PressableScale
                key={i.key}
                onPress={() => {
                  haptics.selection();
                  setPreview(i.key);
                }}
                accessibilityLabel={t(`shop.item.${i.key}`)}
                accessibilityState={{ selected: sel }}
                style={[styles.cell, { backgroundColor: th.card, borderColor: sel ? th.accent : 'transparent' }]}
              >
                <Companion stage={p.stage} happy size={76} equipped={{ ...equipped, [i.slot]: i.key }} />
                <Text variant="footnote" weight="600" numberOfLines={1}>
                  {t(`shop.item.${i.key}`)}
                </Text>
                {on ? (
                  <View style={styles.badge}>
                    <Ionicons name="checkmark-circle" size={14} color={th.success} />
                    <Text variant="caption" tone="secondary">
                      {t('shop.wearing')}
                    </Text>
                  </View>
                ) : have ? (
                  <Text variant="caption" tone="secondary">
                    {t('shop.owned')}
                  </Text>
                ) : (
                  <Text variant="caption" weight="700" tabular>
                    🪙 {i.price}
                  </Text>
                )}
              </PressableScale>
            );
          })}
        </View>
        <Text variant="footnote" tone="secondary" align="center">
          {t('shop.earnHint')}
        </Text>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', gap: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md },
  cell: {
    width: '48%',
    alignItems: 'center',
    gap: 4,
    padding: space.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 2,
  },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
