"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import { isAuthRoute } from "@/lib/authRoutes";

// The site header is hidden on the pre-auth focus pages (see authRoutes) so it
// does not compete with the single-purpose auth cards.
export default function ConditionalHeader() {
  const pathname = usePathname();
  if (isAuthRoute(pathname)) return null;
  return <Header />;
}
