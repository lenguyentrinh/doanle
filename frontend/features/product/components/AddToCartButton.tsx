'use client';

import { useAddToCart } from '@/features/product/hooks/useAddToCart';

// The "Add to Cart" affordance on the ProductCard. Wired to the cart API
// (Story 3.2) via the shared useAddToCart hook: logged-out → login redirect;
// logged-in → dispatch + success toast + a brief "Đã thêm" label.
//
// Visibility is owned by the CTA row wrapper in ProductCard (hover/focus
// reveal on hover-capable pointers, permanently visible on touch) — this
// component only renders its own label/color states.
//
// `disabled` doubles as "out of stock": that state gets its own copy
// ("Báo tôi khi có hàng") and a quieter light shell instead of the solid ink
// button, so a sold-out card doesn't read as a live, clickable CTA.
export default function AddToCartButton({
  productId,
  productName,
  disabled = false,
  className = '',
}: {
  productId: number;
  productName: string;
  disabled?: boolean;
  className?: string;
}) {
  const { addToCart, status } = useAddToCart();
  const outOfStock = disabled;
  const label = outOfStock ? 'Báo tôi khi có hàng' : status === 'added' ? 'Đã thêm' : 'Thêm vào giỏ';

  return (
    <button
      type="button"
      aria-label={outOfStock ? `Báo khi ${productName} có hàng trở lại` : `Thêm ${productName} vào giỏ hàng`}
      disabled={outOfStock || status === 'adding'}
      onClick={() => addToCart(productId)}
      className={`rounded-full px-4 py-3 text-label-xs shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:shadow-none ${
        outOfStock
          ? 'bg-white/96 text-ink'
          : 'bg-ink text-white hover:bg-accent hover:shadow-btn-hover disabled:opacity-40 disabled:hover:bg-ink'
      } ${className}`}
    >
      {label}
    </button>
  );
}
