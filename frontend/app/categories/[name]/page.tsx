import { permanentRedirect } from 'next/navigation';
import { getCategories } from '@/features/product/services/productApi';

// Legacy route. Categories are no longer a separate listing page — they are a
// filter on the unified /products PLP. This permanently redirects
// /categories/<name> -> /products?category=<name> so existing links, bookmarks,
// and search-index entries keep resolving. Known categories stay prerendered as
// static redirects via generateStaticParams (SEO continuity).
export async function generateStaticParams() {
  try {
    const categories = await getCategories();
    return categories.map((name) => ({ name }));
  } catch {
    return [];
  }
}

export default async function CategoryRedirect({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params; // Next has already decoded the segment
  permanentRedirect(`/products?category=${encodeURIComponent(name)}`);
}
