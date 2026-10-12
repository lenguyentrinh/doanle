import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductCard from '@/features/product/components/ProductCard';
import ProductGallery from '@/features/product/components/ProductGallery';
import ProductInfo from '@/features/product/components/ProductInfo';
import {
  getProduct,
  getProducts,
} from '@/features/product/services/productApi';
import type { Product } from '@/types/product';
import { isObjectId } from '@/lib/helpers';

export const revalidate = 60;

// The backend `:id` is Mongo ObjectId. Accept only a canonical
// positive id: no leading zeros (`/products/007` would otherwise resolve to a
// non-canonical duplicate URL) and within signed-INT range (a huge id would
// otherwise overflow → a backend 500 instead of a branded 404). Anything else
// → notFound(), keeping the 404-vs-error discipline consistent.
const isValidId = isObjectId; // route ids are Mongo ObjectIds

// "Complete the Look": same-category products (excluding the current one).
// Supplementary: a fetch failure here must NOT break the PDP, so it's wrapped
// in try/catch and degrades to an empty list (the section then renders nothing).
async function getRelatedProducts(product: Product): Promise<Product[]> {
  try {
    const res = await getProducts({ category: product.category, limit: 5 });
    return res.data.filter((p) => p.id !== product.id).slice(0, 4);
  } catch {
    return [];
  }
}

// Prerender known product pages at build. Guarded so the build still succeeds
// when the backend is unreachable (returns [] → pages render on demand).
export async function generateStaticParams() {
  try {
    const res = await getProducts({ limit: 100 });
    return res.data.map((product) => ({ id: String(product.id) }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  // Never call notFound() here; only the page decides 404. Return safe,
  // generic metadata when the product can't be loaded.
  if (!isValidId(id)) return { title: 'Sản phẩm - Oren' };

  const product = await getProduct(id);
  if (!product) return { title: 'Sản phẩm - Oren' };

  const description = (product.description ?? '').trim().slice(0, 200);
  const title = `${product.name} - Oren`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isValidId(id)) notFound();

  // getProduct returns null on 404 (→ branded not-found) and throws on a real
  // backend failure (→ error.tsx). Do not swallow the throw.
  const product = await getProduct(id);
  if (!product) notFound();

  const related = await getRelatedProducts(product);

  return (
    <div className="pb-[140px]">
      <section className="mx-auto w-full max-w-[1480px] px-[clamp(16px,3.4vw,44px)] py-[clamp(18px,2.6vw,34px)]">
        <div className="flex items-center gap-2 text-caption text-ink-muted">
          <Link href="/products" className="transition-colors duration-200 hover:text-accent">
            Cửa hàng
          </Link>
          <span aria-hidden>·</span>
          <span className="text-ink">{product.name}</span>
        </div>

        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-start gap-[clamp(24px,4vw,72px)]">
          <ProductGallery images={product.imageUrls} productName={product.name} />
          <div className="lg:sticky lg:top-[104px]">
            <ProductInfo product={product} />
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-[clamp(56px,7vw,104px)]" aria-labelledby="related-products">
            <div className="mb-6 flex items-baseline gap-4">
              <span className="text-eyebrow-num">04</span>
              <h2 id="related-products" className="text-display-md text-ink">
                Phối cùng
              </h2>
            </div>
            <div className="flex gap-[clamp(12px,1.5vw,22px)] overflow-x-auto pb-2 [scroll-snap-type:x_mandatory]">
              {related.map((p) => (
                <div key={p.id} className="min-w-0 flex-[0_0_clamp(170px,20vw,270px)] [scroll-snap-align:start]">
                  <ProductCard product={p} compact />
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
