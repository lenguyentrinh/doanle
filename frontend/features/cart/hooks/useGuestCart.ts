"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CartLine } from "@/types/cart";
import { getGuestCart, toGuestLineId } from "@/features/cart/lib/guestCart";
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
  const cachedProducts = useRef<Map<string, CartLine['product']>>(new Map());

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
  guestItems: { productId: string; quantity: number }[],
  products: Map<string, CartLine['product']>,
): CartLine[] {
  const lines: CartLine[] = [];
  for (const gi of guestItems) {
    const product = products.get(gi.productId);
    if (!product) continue;
    // Guest lines have no server row id: use a prefixed product id, which can
    // never collide with a real cart_items ObjectId. The guest handlers
    // recover the product id via fromGuestLineId(itemId).
    lines.push({
      id: toGuestLineId(product.id),
      product,
      quantity: gi.quantity,
    });
  }
  return lines;
}

function computeSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.product.finalPrice * line.quantity, 0);
}
