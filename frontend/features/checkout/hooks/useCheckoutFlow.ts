'use client';

import { useCallback, useState } from 'react';

export interface CheckoutAddress {
  id: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
}

export interface CheckoutFlow {
  step: number;
  address: CheckoutAddress | null;
  orderId: string | null;
  idempotencyKey: string;
  setAddress: (address: CheckoutAddress) => void;
  setOrderId: (orderId: string) => void;
  goNext: () => void;
  goBack: () => void;
}

export const LAST_STEP = 3;

// Owns all cross-step checkout state. idempotencyKey is generated exactly
// once (lazy useState initializer runs a single time on mount) and never
// regenerated, so a Step-4 retry after a transient failure reuses the same
// key/order instead of creating a duplicate.
export function useCheckoutFlow(): CheckoutFlow {
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState<CheckoutAddress | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const goNext = useCallback(() => {
    setStep((s) => Math.min(s + 1, LAST_STEP));
  }, []);
  const goBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  return {
    step,
    address,
    orderId,
    idempotencyKey,
    setAddress,
    setOrderId,
    goNext,
    goBack,
  };
}
