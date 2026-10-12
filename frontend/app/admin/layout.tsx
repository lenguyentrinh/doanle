'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import UnifiedLayoutContent from '@/components/layout/UnifiedLayoutContent';
import type { RootState } from '@/store/store';

// Uses the same client-side useRequireAuth pattern as /account so the axios
// interceptor can silently refresh an expired access token instead of
// logging the admin out; non-admins are bounced to /login once auth resolves.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, authChecked } = useRequireAuth();
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (authChecked && isAuthenticated && !isAdmin) {
      router.replace('/login');
    }
  }, [authChecked, isAuthenticated, isAdmin, router]);

  if (!authChecked) {
    return (
      <div className="flex flex-1 items-center justify-center bg-paper">
        <p className="text-body-md text-ink-muted">Đang tải trang quản trị...</p>
      </div>
    );
  }
  if (!isAuthenticated || !isAdmin) return null;

  return <UnifiedLayoutContent isAdmin>{children}</UnifiedLayoutContent>;
}
