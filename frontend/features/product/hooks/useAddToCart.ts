"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { addCartItemThunk } from "@/features/cart/store/cartThunk";
import { addToGuestCart } from "@/features/cart";
import { useCartDrawer } from "@/features/cart/context/CartDrawerContext";
import { showToast } from "@/lib/toast";

type AddStatus = "idle" | "adding" | "added";

/**
 * Shared "Add to Cart" behaviour for the ProductCard and PDP buttons.
 *
 * - Logged in: dispatch addCartItemThunk, show the success toast, and surface a
 *   transient "added" status (~1.5s) so the button can flash "✓ Added to Cart".
 * - Logged out (Story 3.3): store in localStorage as guest cart item, show
 *   success toast, no redirect.
 * - On failure: a non-silent error toast; status returns to idle.
 *
 * The Header badge increment is NOT handled here — it falls out of the slice
 * update from the thunk's CartView (auth) or from localStorage (guest).
 */
export function useAddToCart() {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector(
    (s: RootState) => s.auth.isAuthenticated,
  );
  const [status, setStatus] = useState<AddStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { open: openCartDrawer } = useCartDrawer();

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const addToCart = useCallback(
    async (productId: number, quantity = 1) => {
      if (!isAuthenticated) {
        addToGuestCart(productId, quantity);
        showToast.success("Đã thêm vào giỏ! Xem giỏ hàng hoặc tiếp tục mua sắm.");
        setStatus("added");
        openCartDrawer();
        timer.current = setTimeout(() => setStatus("idle"), 1500);
        return;
      }

      setStatus("adding");
      try {
        await dispatch(addCartItemThunk({ productId, quantity })).unwrap();
        showToast.success("Đã thêm vào giỏ! Xem giỏ hàng hoặc tiếp tục mua sắm.");
        setStatus("added");
        openCartDrawer();
        timer.current = setTimeout(() => setStatus("idle"), 1500);
      } catch (err) {
        const msg = typeof err === "string" ? err : "";
        showToast.error(
          /stock/i.test(msg)
            ? "Không đủ hàng trong kho."
            : "Thêm vào giỏ thất bại. Vui lòng thử lại.",
        );
        setStatus("idle");
      }
    },
    [dispatch, isAuthenticated, openCartDrawer],
  );

  return { addToCart, status };
}
