import Link from 'next/link';
import type { Product } from '@/types/product';
import ProductCard from '@/features/product/components/ProductCard';
import { QuickViewScope } from '@/features/product/context/QuickViewContext';
import SectionHeading from '@/features/home/components/SectionHeading';

// "Vừa về" — a plain 4-up grid reusing the shared ProductCard, so this
// rail stays visually consistent with the PLP grid (the prototype's home
// page uses a grid here, not a carousel).
//
// Server Component: ProductCard isolates its only client piece (Add to Cart).
export default function NewArrivals({
  products,
  viewAllHref,
}: {
  products: Product[];
  viewAllHref: string | null;
}) {
  return (
    <section aria-labelledby="new-arrivals-heading" className="mx-auto w-full max-w-[1480px] px-[clamp(16px,3.4vw,44px)] pt-24">
      <div className="mb-[clamp(22px,3vw,38px)]">
        <SectionHeading
          num="01"
          title="Vừa về"
          headingId="new-arrivals-heading"
          right={
            <>
              {viewAllHref && (
                <Link
                  href={viewAllHref}
                  className="border-b border-line-strong pb-[3px] text-label-sm text-ink transition-all duration-200 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  Xem tất cả
                </Link>
              )}
            </>
          }
        />
      </div>

      {products.length > 0 ? (
        <QuickViewScope products={products.slice(0, 4)}>
          <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[clamp(12px,1.6vw,24px)] md:grid-cols-[repeat(4,minmax(0,1fr))]">
            {products.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </QuickViewScope>
      ) : (
        <p className="border-t border-line py-16 text-center text-body-md text-ink-muted">
          Bộ sưu tập đang được tuyển chọn. Quay lại sau nhé.
        </p>
      )}
    </section>
  );
}
