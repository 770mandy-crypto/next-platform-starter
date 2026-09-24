import type { Point } from '@/lib/geo';
import type { ItemCard } from '@/lib/types';

import { ItemsListFallback } from './items-list-fallback';

export function ItemsMap({ items }: { items: ItemCard[]; center: Point }) {
  return <ItemsListFallback items={items} />;
}
