// Pre-auth flows (login, signup, verify email, password recovery) are
// single-purpose focus pages: they render without the site header and footer
// so nothing competes with the form. This is the single source of truth for
// which routes count as "auth routes" — both ConditionalHeader and
// ConditionalFooter consume it.
export const AUTH_ROUTE_PREFIXES = [
  "/login",
  "/signup",
  "/verify-email",
  "/forgotPassword",
];

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// The admin section (Story 5.1) has its own sidebar-nav shell — the site
// header/footer would double up navigation chrome, so it's hidden the same
// way as the pre-auth pages. Kept separate from AUTH_ROUTE_PREFIXES: that
// array is semantically "pre-auth focus pages," which /admin is not.
export function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
