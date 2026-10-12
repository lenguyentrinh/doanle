'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import UnifiedLayoutContent from '@/components/layout/UnifiedLayoutContent';
import type { RootState } from '@/store/store';

const navLink =
  'w-fit border-l pl-4 text-body-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2';
const railLink = (active: boolean) =>
  `${navLink} ${active ? 'border-accent text-ink' : 'border-transparent text-ink-secondary hover:text-ink'}`;

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authChecked } = useRequireAuth();
  const user = useSelector((state: RootState) => state.auth.user);
  const pathname = usePathname();
  const isAdmin = user?.role === 'admin';

  if (!authChecked) {
    return (
      <div className="flex flex-1 items-center justify-center bg-paper">
        <p className="text-body-md text-ink-muted">Đang tải tài khoản của bạn...</p>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  const onProfile = pathname === '/account';

  return (
    <>
      <UnifiedLayoutContent isAdmin={isAdmin}>
        {/* Mobile account nav: the rail is desktop-only, so nav survives below md */}
        <nav className="mb-lg flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line pb-sm md:hidden">
          <Link href="/account" aria-current={onProfile ? 'page' : undefined} className={railLink(onProfile)}>
            Hồ sơ
          </Link>
          <span
            aria-disabled="true"
            title="Sắp có"
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
