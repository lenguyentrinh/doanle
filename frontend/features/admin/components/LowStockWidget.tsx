import Link from 'next/link';
import type { LowStockProductSummary } from '../services/adminAPI';

// Stock bar fills relative to this "comfortably stocked" reference point —
// not the low-stock alert threshold (which is much lower and configurable
// server-side) — so the bar has visible room to grow as stock is topped up.
const STOCK_HEALTHY_THRESHOLD = 12;

// "Edit" links to /admin/products/:id/edit, which 404s until Story 5.2
// ships — an expected, sequencing-driven gap (see story Dev Notes).
export default function LowStockWidget({
  products,
}: {
  products: LowStockProductSummary[];
}) {
  return (
    <div className="rounded-2xl border border-line bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-[18px]">
        <h2 className="text-label-xs text-ink-secondary">Sắp hết hàng</h2>
        <span className="rounded-full bg-alert-bg px-2 py-0.5 text-[10px] font-semibold tabular-nums text-alert">
          {products.length}
        </span>
      </div>
      {products.length === 0 ? (
        <p className="px-5 py-6 text-body-sm text-success">
          Tất cả sản phẩm đều còn hàng
        </p>
      ) : (
        <ul>
          {products.map((product) => (
            <li
              key={product.id}
              className="flex flex-col gap-[9px] border-b border-line px-5 py-4 last:border-b-0"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-body-sm text-ink">{product.name}</span>
                <Link
                  href={`/admin/products/${product.id}/edit`}
                  className="shrink-0 text-label-xs text-ink-muted transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  Sửa
                </Link>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="relative h-[3px] flex-1 rounded-full bg-line">
                  <span
                    className="absolute left-0 top-0 h-full rounded-full bg-alert"
                    style={{
                      width: `${Math.min(100, (product.stockQuantity / STOCK_HEALTHY_THRESHOLD) * 100)}%`,
                    }}
                  />
                </span>
                <span className="shrink-0 text-caption tabular-nums text-alert">
                  còn {product.stockQuantity}
                </span>
              </div>
              <span className="text-caption text-ink-faint">{product.category}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
