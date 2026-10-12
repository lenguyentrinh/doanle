'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Product } from '@/types/product';

interface QuickViewState {
  product: Product | null;
  list: Product[];
  open: (product: Product, list?: Product[]) => void;
  close: () => void;
  step: (delta: 1 | -1) => void;
}

const QuickViewContext = createContext<QuickViewState>({
  product: null,
  list: [],
  open: () => {},
  close: () => {},
  step: () => {},
});

// Products shown by the nearest grid; QuickViewButton passes them to `open`
// so the popup can step prev/next through the same list.
const QuickViewScopeContext = createContext<Product[]>([]);

export function QuickViewScope({ products, children }: { products: Product[]; children: ReactNode }) {
  return <QuickViewScopeContext.Provider value={products}>{children}</QuickViewScopeContext.Provider>;
}

export function useQuickViewScope(): Product[] {
  return useContext(QuickViewScopeContext);
}

// Shared state for the Quick View modal — QuickViewButton (on every
// ProductCard, across Home/PLP/PDP) sets the active product, QuickViewModal
// (mounted once in LayoutShell) reads it. Mirrors CartDrawerContext's shape.
export function QuickViewProvider({ children }: { children: ReactNode }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [list, setList] = useState<Product[]>([]);

  const open = useCallback((p: Product, l?: Product[]) => {
    setProduct(p);
    setList(l && l.some((x) => x.id === p.id) ? l : [p]);
  }, []);
  const close = useCallback(() => setProduct(null), []);
  const step = useCallback(
    (delta: 1 | -1) => {
      setProduct((current) => {
        if (!current || list.length < 2) return current;
        const i = list.findIndex((x) => x.id === current.id);
        return list[(i + delta + list.length) % list.length];
      });
    },
    [list],
  );

  const value = useMemo(() => ({ product, list, open, close, step }), [product, list, open, close, step]);
  return <QuickViewContext.Provider value={value}>{children}</QuickViewContext.Provider>;
}

export function useQuickView(): QuickViewState {
  return useContext(QuickViewContext);
}
