export type ItemSlot = 'hat' | 'accessory';

export interface ShopItem {
  key: string;
  slot: ItemSlot;
  price: number;
  emoji: string;
}

/** Cosmetics for Pip. Rendered as vector art in Companion.tsx; the emoji is the shop thumbnail fallback. */
export const SHOP_ITEMS: ShopItem[] = [
  { key: 'partyHat', slot: 'hat', price: 80, emoji: '🥳' },
  { key: 'beanie', slot: 'hat', price: 120, emoji: '🧶' },
  { key: 'wizardHat', slot: 'hat', price: 180, emoji: '🧙' },
  { key: 'crown', slot: 'hat', price: 300, emoji: '👑' },
  { key: 'bowtie', slot: 'accessory', price: 60, emoji: '🎀' },
  { key: 'sunglasses', slot: 'accessory', price: 100, emoji: '😎' },
  { key: 'scarf', slot: 'accessory', price: 140, emoji: '🧣' },
];

export interface Equipped {
  hat: string | null;
  accessory: string | null;
}

export function itemByKey(key: string | null): ShopItem | undefined {
  return key ? SHOP_ITEMS.find((i) => i.key === key) : undefined;
}
