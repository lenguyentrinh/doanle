import Link from 'next/link';
import type { Product } from '@/types/product';
import { formatPrice, isNewProduct } from '@/lib/helpers';
import { PRODUCT_IMAGE_FALLBACK } from '@/lib/productImage';
import ProductImage from '@/components/ProductImage';
import AddToCartButton from './AddToCartButton';
import QuickViewButton from './QuickViewButton';

// Boho card: no chrome (no border/bg/shadow on the article — elevation comes
// from the photography, not a box). Two images cross-fade on hover: imageUrls[1]
// sits underneath as the base layer, imageUrls[0] fades out on top to reveal it
// (falls back to the same image twice when a product only has one photo).
// The CTA row is anchored to its own `relative` wrapper around the image, not
// to the <article> — anchoring it to the article lets its offset drift with
// the height of the name/price block below and can cover the category label.
// Server Component; Add to Cart / Quick View / ProductImage (onError fallback
// needs a client component) are the only client subcomponents.
//
// `compact`: the PDP "Phối cùng" rail uses a quieter card per spec — no
// stock badge, no hover Add-to-Cart/Quick-View overlay, slightly smaller name
// and tighter block spacing. Same component so the image cross-fade/link
// behavior never drifts between the main grid and the rail.
export default function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const inStock = product.stockQuantity > 0;
  const lowStock = inStock && product.stockQuantity <= 5;
  const isNew = isNewProduct(product.createdAt);
  const primaryImage = product.imageUrls?.[0] ?? PRODUCT_IMAGE_FALLBACK;
  const baseImage = product.imageUrls?.[1] ?? primaryImage;
  const href = `/products/${product.id}`;

  const badge = !inStock
    ? { label: 'Hết hàng', className: 'bg-ink/55 text-white' }
    : isNew
      ? { label: 'Mới', className: 'bg-accent text-white' }
      : lowStock
        ? { label: `Chỉ còn ${product.stockQuantity}`, className: 'bg-ink/88 text-white backdrop-blur-sm' }
        : null;

  const hasDiscount = Boolean(product.discountPercentage);

  return (
    <article className="group flex h-full flex-col motion-safe:animate-rise">
      <div className="group/media relative">
        <Link
          href={href}
          className={`relative block aspect-[4/5] overflow-hidden rounded-[16px] bg-fill-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 ${
            inStock ? '' : 'opacity-55'
          }`}
        >
          <ProductImage
            src={baseImage}
            alt=""
            fill
            aria-hidden
            sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
            className="object-cover"
          />
          <ProductImage
            src={primaryImage}
            alt={product.name}
            fill
            sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
            className="absolute inset-0 object-cover transition-[opacity_0.6s_cubic-bezier(0.16,1,0.3,1),transform_0.8s_cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-0 group-focus-within:opacity-0 motion-safe:group-hover:scale-[1.04] motion-safe:group-focus-within:scale-[1.04]"
          />
        </Link>

        {!compact && badge && (
          <span
            className={`absolute left-3 top-3 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.2em] ${badge.className}`}
          >
            {badge.label}
          </span>
        )}

        {hasDiscount && (
          <span className="absolute right-3 top-3 whitespace-nowrap rounded-full bg-accent px-3.5 py-1.5 text-[9.5px] font-semibold text-white">
            −{product.discountPercentage}%
          </span>
        )}

        {/* CTA row — 12px above the IMAGE bottom, anchored to this wrapper, not the article.
            Both buttons always render, side by side; Add to Bag is disabled (muted, not
            clickable) rather than removed when the product is sold out. Omitted entirely
            in `compact` mode — the related rail is a quiet carousel, not a shoppable grid.
            Hidden until hover/focus on hover-capable pointers only (`@media (hover: hover)`);
            touch devices (which never match that query) get it permanently visible, since
            there's no hover gesture there to reveal it with. */}
        {!compact && (
          <div className="absolute inset-x-3 bottom-3 z-10 flex translate-y-0 gap-2 opacity-100 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] [@media(hover:hover)]:translate-y-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/media:translate-y-0 [@media(hover:hover)]:group-hover/media:opacity-100 [@media(hover:hover)]:group-focus-within/media:translate-y-0 [@media(hover:hover)]:group-focus-within/media:opacity-100">
            <AddToCartButton
              productId={product.id}
              productName={product.name}
              disabled={!inStock}
              className="flex-1"
            />
            <QuickViewButton product={product} className="w-11" />
          </div>
        )}
      </div>

      <div className={`flex flex-col px-0.5 ${compact ? 'gap-1 pt-3.5' : 'gap-1.5 pt-4'}`}>
        <span className="text-label-xs text-ink-muted">{product.category}</span>
        <Link
          href={href}
          className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <h3 className={`text-product text-ink ${compact ? 'text-[17px]' : 'text-[19px] leading-[1.28]'}`}>{product.name}</h3>
        </Link>
        <div className="mt-[3px] flex items-baseline justify-between gap-2.5 border-t border-line pt-2.5">
          <p className="flex items-baseline gap-2">
            <span className={`font-display text-[19px] font-medium tabular-nums ${hasDiscount ? 'text-accent' : 'text-ink'}`}>
              {formatPrice(hasDiscount ? product.finalPrice : product.price)}
            </span>
            {hasDiscount && (
              <span className="font-display text-[13px] tabular-nums text-ink-faint line-through">
                {formatPrice(product.price)}
              </span>
            )}
          </p>
          {inStock ? (
            <span className={`text-[11.5px] tabular-nums ${lowStock ? 'text-accent' : 'text-ink-muted'}`}>
              Còn {product.stockQuantity}
            </span>
          ) : (
            <span className="text-[11.5px] text-ink-muted">Hết hàng</span>
          )}
        </div>
      </div>
    </article>
  );
}
