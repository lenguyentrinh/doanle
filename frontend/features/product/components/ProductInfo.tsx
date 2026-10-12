import type { Product } from '@/types/product';
import { formatPrice } from '@/lib/helpers';
import PdpPurchasePanel from './PdpPurchasePanel';

// Split the description into editorial paragraphs on blank lines (DESIGN.md →
// "Styling Notes": magazine paragraphs, never a bullet list).
function toParagraphs(text: string): string[] {
  const parts = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text.trim()].filter(Boolean);
}

const PERKS = ['Đổi trả 30 ngày', 'Miễn phí ship trên 500.000₫', 'Bảo hành đường may'];

// PDP info panel (right column): flat editorial column on the paper ground,
// hierarchy carried by type scale and whitespace alone. Server Component; the
// only interactive piece is the PdpPurchasePanel subcomponent. The page wraps
// this in a sticky desktop column.
//
// No size selector: the Product model has no variant fields today. Do NOT
// fabricate sizes here — when a real variant model lands, add the selector
// then.
// Mirrors PdpPurchasePanel's own inStock/lowStock read of the same
// stockQuantity — kept in sync there, not shared, since this pill needs to
// render next to the price (spec) while the panel needs the booleans to
// branch its qty-stepper vs "Hết hàng" button.
function getStockPill(stockQuantity: number) {
  const inStock = stockQuantity > 0;
  const lowStock = inStock && stockQuantity <= 5;
  return !inStock
    ? { label: 'Hết hàng', className: 'bg-error-bg text-error-strong' }
    : lowStock
      ? { label: `Chỉ còn ${stockQuantity}`, className: 'bg-alert-bg text-alert' }
      : { label: 'Còn hàng', className: 'bg-success-bg text-success' };
}

export default function ProductInfo({ product }: { product: Product }) {
  const paragraphs = toParagraphs(product.description);
  const stockPill = getStockPill(product.stockQuantity);
  const hasDiscount = Boolean(product.discountPercentage);

  return (
    <div className="flex flex-col gap-6 lg:pl-2">
      <div className="flex flex-col gap-3">
        <span className="text-label-xs text-accent">{product.category}</span>
        <h1 className="text-display-md text-ink">{product.name}</h1>
        <div className="flex flex-wrap items-center gap-3.5">
          <p className="flex items-baseline gap-3">
            <span className={`text-headline-md tabular-nums ${hasDiscount ? 'text-accent' : 'text-ink'}`}>
              {formatPrice(hasDiscount ? product.finalPrice : product.price)}
            </span>
            {hasDiscount && (
              <span className="text-body-md tabular-nums text-ink-faint line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </p>
          {hasDiscount && (
            <span className="inline-flex w-fit items-center rounded-full bg-accent px-3.5 py-1.5 text-label-xs text-white">
              −{product.discountPercentage}%
            </span>
          )}
          <span className={`inline-flex w-fit items-center rounded-full px-3.5 py-1.5 text-label-xs ${stockPill.className}`}>
            {stockPill.label}
          </span>
        </div>
      </div>

      {paragraphs.length > 0 && (
        <div className="flex flex-col gap-4">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="max-w-[56ch] text-body-lg text-ink-secondary">
              {paragraph}
            </p>
          ))}
        </div>
      )}

      <div className="border-t border-line pt-5">
        <PdpPurchasePanel
          productId={product.id}
          productName={product.name}
          price={hasDiscount ? product.finalPrice : product.price}
          stockQuantity={product.stockQuantity}
          imageUrl={product.imageUrls?.[0]}
        />
      </div>

      <div className="flex flex-wrap gap-2.5 border-t border-line pt-5">
        {PERKS.map((perk) => (
          <span key={perk} className="inline-flex items-center gap-2 rounded-full bg-fill px-4 py-2 text-body-sm text-ink-secondary">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-olive)" strokeWidth="2.4" aria-hidden>
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
            {perk}
          </span>
        ))}
      </div>
    </div>
  );
}
