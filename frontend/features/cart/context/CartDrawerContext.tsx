'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface CartDrawerState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

// Default (no provider mounted, e.g. a component rendered in isolation in a
// test) is a safe no-op rather than a throw — opening a drawer that isn't
// there just does nothing.
const CartDrawerContext = createContext<CartDrawerState>({
  isOpen: false,
  open: () => {},
  close: () => {},
});

// Shared open/closed state for the cart drawer — the Header's bag icon opens
// it, useAddToCart opens it after every successful add, and the drawer
// itself reads it to render. Kept as its own context rather than folding
// into the cart Redux slice: this is pure UI state, not cart data.
export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);
  return <CartDrawerContext.Provider value={value}>{children}</CartDrawerContext.Provider>;
}

export function useCartDrawer(): CartDrawerState {
  return useContext(CartDrawerContext);
}
