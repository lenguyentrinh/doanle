"use client";

import { Provider, useDispatch, useSelector } from "react-redux";
import { useEffect, useRef } from "react";
import { store, type AppDispatch, type RootState } from "@/store/store";
import { Toaster } from "react-hot-toast";
import { fetchMeThunk } from "@/features/auth/store/authThunk";
import { fetchCartThunk } from "@/features/cart/store/cartThunk";
import { clearCart } from "@/features/cart/store/cartSlice";
import { getGuestCart, clearGuestCart } from "@/features/cart/lib/guestCart";
import { mergeCartAPI } from "@/features/cart/services/cartAPI";
import { showToast } from "@/lib/toast";

function AuthBootstrap() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, authChecked } = useSelector(
    (s: RootState) => s.auth,
  );
  const prevAuth = useRef(false);

  // Hydrate the session once on mount.
  useEffect(() => {
    dispatch(fetchMeThunk());
  }, [dispatch]);

  useEffect(() => {
    if (!authChecked) return;

    const was = prevAuth.current;
    prevAuth.current = isAuthenticated;

    if (isAuthenticated) {
      if (!was) {
        const guestItems = getGuestCart();
        if (guestItems.length > 0) {
          mergeCartAPI(guestItems)
            .then(() => {
              clearGuestCart();
              dispatch(fetchCartThunk());
            })
            .catch(() => {
              showToast.error('Không thể hợp nhất giỏ hàng khách. Một số sản phẩm có thể bị thiếu.');
              dispatch(fetchCartThunk());
            });
        } else {
          dispatch(fetchCartThunk());
        }
      }
    } else {
      dispatch(clearCart());
    }
  }, [authChecked, isAuthenticated, dispatch]);

  // Side-effect-only component: renders nothing, but must return a valid
  // ReactNode (not void) to be usable as <AuthBootstrap />.
  return null;
}

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Provider store={store}>
      <AuthBootstrap />
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 2400,
          // Floating ink pill: bg-ink / text-paper, body-sm voice, full pill
          // radius and a warm-tinted overlay shadow — matches globals.css's
          // --color-ink/-paper/-shadow-overlay. Hardcoded (react-hot-toast's
          // style prop takes real CSS values, not Tailwind classes) — keep in
          // sync with globals.css by hand if the palette changes again.
          style: {
            background: "#3f3128",
            color: "#ffffff",
            borderRadius: "9999px",
            fontSize: "13.5px",
            lineHeight: "1.55",
            boxShadow:
              "0 2px 6px rgba(63, 49, 40, 0.12), 0 12px 28px -8px rgba(63, 49, 40, 0.22), 0 32px 64px -16px rgba(150, 110, 78, 0.3)",
          },
          success: {
            duration: 2400,
            iconTheme: {
              primary: "#e8a888",
              secondary: "#3f3128",
            },
          },
          error: {
            duration: 2400,
            iconTheme: {
              primary: "#e8a888",
              secondary: "#3f3128",
            },
          },
        }}
      />
    </Provider>
  );
}
