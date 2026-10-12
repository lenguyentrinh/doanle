import type { Product } from '@/types/product';
import { QuickViewScope } from '@/features/product/context/QuickViewContext';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: Product[];
}

// Simple responsive grid — pagination handles navigation.
export default function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-body-md text-ink-muted">
          Chưa có sản phẩm nào trong danh mục này
        </p>
      </div>
    );
  }

  // Fixed column counts, not auto-fill: with an 8-per-page PLP, auto-fill
  // opens a 5th (empty) column track on wide viewports whenever the last row
  // is short, dumping the leftover space on the right instead of keeping the
  // grid flush. A hard grid-cols always fills the row it's given.
  // 2 / 3 / 4 columns, matching this page's loading skeleton — without the
  // md:grid-cols-3 step, the grid jumped straight from 4 to 2 columns right
  // at the point the filter sidebar appears (md) and left it looking cramped.
  return (
    <QuickViewScope products={products}>
      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[clamp(12px,1.6vw,24px)] md:grid-cols-[repeat(3,minmax(0,1fr))] lg:grid-cols-[repeat(4,minmax(0,1fr))]">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </QuickViewScope>
  );
}
