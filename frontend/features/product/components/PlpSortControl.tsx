'use client';

import { useRouter } from 'next/navigation';
import SortSelect from './SortSelect';
import { buildProductsHref, type CurrentFilters } from '@/features/product/productFilters';
import type { ProductSort } from '@/types/product';

// The page header's own sort control (spec moved "Sắp xếp" out of the
// sidebar and into the header, right-aligned next to the result count).
// Reuses SortSelect's existing UI/keyboard logic untouched — this just wires
// its onChange straight to the URL via the same buildProductsHref every other
// filter link already uses, so it never drifts from how the sidebar/chips
// build query strings.
export default function PlpSortControl({ current }: { current: CurrentFilters }) {
  const router = useRouter();
  const setSort = (next: ProductSort | '') =>
    router.push(buildProductsHref({ ...current, sort: next || undefined }));

  return <SortSelect value={current.sort ?? ''} onChange={setSort} />;
}
