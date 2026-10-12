"use client";

import { usePathname } from "next/navigation";
import Ticker from "@/features/product/components/Ticker";
import { isAuthRoute } from "@/lib/authRoutes";

// The ticker is persistent global chrome that travels with the site header
// (Story: Boho redesign spec wraps ticker+header together). Hidden on the
// same pre-auth focus pages where ConditionalHeader hides the header, so it
// never appears where the header itself doesn't.
export default function ConditionalTicker() {
  const pathname = usePathname();
  if (isAuthRoute(pathname)) return null;
  return <Ticker />;
}
