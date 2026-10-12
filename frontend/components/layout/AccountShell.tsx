'use client';

import Link from 'next/link';
import { useSelector } from 'react-redux';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import UnifiedLayoutContent from '@/components/layout/UnifiedLayoutContent';
import { navLink, railLink } from '@/lib/navStyles';
import type { RootState } from '@/store/store';

type AccountSection = 'profile' | 'orders';

interface AccountShellProps {
  children: React.ReactNode;
  activeSection: AccountSection;
  loadingMessage: string;
}

export default function AccountShell({
  children,
  activeSection,
  loadingMessage,
}: AccountShellProps) {
  const { isAuthenticated, authChecked } = useRequireAuth();
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.role === 'admin';

  if (!authChecked) {
    return (
      <div className="flex flex-1 items-center justify-center bg-paper">
        <p className="text-body-md text-ink-muted">{loadingMessage}</p>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const onProfile = activeSection === 'profile';
  const onOrders = activeSection === 'orders';

  return (
    <>
      <UnifiedLayoutContent isAdmin={isAdmin}>
        {/* Mobile account nav: the rail is desktop-only, so nav survives below md */}
        <nav className="mb-lg flex items-center gap-lg border-b border-line pb-sm md:hidden">
          <Link href="/account" aria-current={onProfile ? 'page' : undefined} className={railLink(onProfile)}>
            Hồ sơ
          </Link>
          <Link
            href="/orders"
            aria-current={onOrders ? 'page' : undefined}
            className={railLink(onOrders)}
          >
            Đơn hàng
          </Link>
          <span
            aria-disabled="true"
            title="Sắp ra mắt"
            className={`${navLink} cursor-not-allowed border-transparent text-ink-muted`}
          >
            Bảo mật
          </span>
        </nav>
        {children}
      </UnifiedLayoutContent>
    </>
  );
}
