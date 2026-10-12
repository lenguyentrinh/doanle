"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { usePathname, useRouter } from "next/navigation";
import { RootState } from "@/store/store";

/**
 * Guard hook for protected pages.
 *
 * Waits for session hydration (`authChecked`, set by `fetchMeThunk` in
 * `providers.tsx`) before deciding, so it never flash-redirects on first load.
 * When hydration has completed and the user is not authenticated, it redirects
 * to `/login?return=<current-path>` so the shopper lands back here after login.
 *
 * Returns `{ isAuthenticated, authChecked }` so pages can render a loading
 * state until `authChecked` is true.
 */
export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, authChecked } = useSelector(
    (state: RootState) => state.auth,
  );

  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      router.replace(`/login?return=${encodeURIComponent(pathname)}`);
    }
  }, [authChecked, isAuthenticated, pathname, router]);

  return { isAuthenticated, authChecked };
}
