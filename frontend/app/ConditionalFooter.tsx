"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/layout/Footer";
import { isAuthRoute } from "@/lib/authRoutes";

// Pre-auth flows (login, signup, verify email, password recovery) are
// single-purpose focus pages — they intentionally render without the site
// footer so nothing competes with the form. See authRoutes for the shared list.
export default function ConditionalFooter() {
  const pathname = usePathname();
  if (isAuthRoute(pathname)) return null;
  return <Footer />;
}
