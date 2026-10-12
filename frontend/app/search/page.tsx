import { permanentRedirect } from 'next/navigation';
import type { RawSearchParams } from '@/features/product/productFilters';

// Legacy route. Search is no longer a separate listing page — it is a filter on
// the unified /products PLP. This permanently redirects /search?q=<term> (and
// any carried filters) to /products?search=<term>&... so old links keep working.
function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export default async function SearchRedirect({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();

  // Map the legacy `q` (or `search`) term to the canonical `search` key.
  const term = first(sp.q) ?? first(sp.search);
  if (term) params.set('search', term);

  // Preserve any filters that were on the old URL.
  for (const key of ['category', 'minPrice', 'maxPrice', 'inStock', 'sort', 'page']) {
    const value = first(sp[key]);
    if (value) params.set(key, value);
  }

  const qs = params.toString();
  permanentRedirect(qs ? `/products?${qs}` : '/products');
}
