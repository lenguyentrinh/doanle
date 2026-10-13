'use client';

import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import AccountShell from '@/components/layout/AccountShell';
import PageLoader from '@/components/PageLoader';

// Orders share the account shell (rail + editorial portrait) so a shopper's
// order tracking reads as part of "their account". Uses the same client-side
// useRequireAuth pattern as /account so the axios interceptor can silently
// refresh an expired access token instead of logging the user out.
export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authChecked } = useRequireAuth();

  if (!authChecked) {
    return (
      <div className="flex flex-1 items-center justify-center bg-paper">
        <p className="text-body-md text-ink-muted">Đang tải đơn hàng của bạn...</p>
      </div>
    );
  }
  if (!isAuthenticated) return <PageLoader />;

  return (
    <AccountShell activeSection="orders" loadingMessage="Đang tải đơn hàng của bạn...">
      {children}
    </AccountShell>
  );
}
