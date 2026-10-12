"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CartLine } from "@/types/cart";
import { getGuestCart } from "@/features/cart/lib/guestCart";
import { getProductsByIds } from "@/features/product/services/productApi";

export interface GuestCartState {
  items: CartLine[];
  subtotal: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useGuestCart(): GuestCartState {
  const [items, setItems] = useState<CartLine[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const cachedProducts = useRef<Map<number, CartLine['product']>>(new Map());

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const guestItems = getGuestCart();

    if (guestItems.length === 0) {
      setItems([]);
      setSubtotal(0);
      setLoading(false);
      return;
    }

    const productIds = guestItems.map((i) => i.productId);
    const uncached = productIds.filter((id) => !cachedProducts.current.has(id));

    if (uncached.length === 0) {
      const lines = buildLines(guestItems, cachedProducts.current);
      setItems(lines);
      setSubtotal(computeSubtotal(lines));
      setLoading(false);
      return;
    }

    setLoading(true);
    getProductsByIds(uncached)
      .then(({ products, failedIds }) => {
        for (const p of products) {
          cachedProducts.current.set(p.id, p);
        }
        const lines = buildLines(guestItems, cachedProducts.current);
        setItems(lines);
        setSubtotal(computeSubtotal(lines));
        setError(
          failedIds.length > 0
            ? `Could not load ${failedIds.length} product(s). Cart may be incomplete.`
            : null,
        );
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load cart');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [refreshKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { items, subtotal, loading, error, refresh };
}

function buildLines(
  guestItems: { productId: number; quantity: number }[],
  products: Map<number, CartLine['product']>,
): CartLine[] {
  const lines: CartLine[] = [];
  for (const gi of guestItems) {
    const product = products.get(gi.productId);
    if (!product) continue;
    // Negative product id: unique per the caller's dedupe-by-productId Map,
    // and always negative so it can never collide with a real (positive)
    // server-side cart_items row id. `page.tsx`'s guest handlers recover the
    // product id via Math.abs(itemId) — this must stay derived from the
    // actual product id, not an array-position counter.
    lines.push({
      id: -product.id,
      product,
      quantity: gi.quantity,
    });
  }
  return lines;
}

function computeSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.product.finalPrice * line.quantity, 0);
}
