'use client';

import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import SharedSidebar from './SharedSidebar';

interface UnifiedLayoutContentProps {
  children: React.ReactNode;
  isAdmin?: boolean;
}

export default function UnifiedLayoutContent({
  children,
  isAdmin = false,
}: UnifiedLayoutContentProps) {
  const pathname = usePathname();
  const sessionEmail = useSelector((state: RootState) => state.auth.user?.email);

  const adminSections = [
    { label: 'Bảng điều khiển', href: '/admin', isActive: pathname === '/admin' },
    { label: 'Sản phẩm', href: '/admin/products', isActive: pathname.startsWith('/admin/products') },
    { label: 'Danh mục', href: '/admin/categories', isActive: pathname.startsWith('/admin/categories') },
    { label: 'Giảm giá', href: '/admin/discounts', isActive: pathname.startsWith('/admin/discounts') },
    { label: 'Trang chủ', href: '/admin/home', isActive: pathname.startsWith('/admin/home') },
    { label: 'Đơn hàng', href: '/admin/orders', isActive: pathname.startsWith('/admin/orders') },
  ];

  const accountSections = [
    { label: 'Hồ sơ', href: '/account', isActive: pathname === '/account' },
    { label: 'Đơn hàng', href: '/orders', isActive: pathname.startsWith('/orders') },
    { label: 'Bảo mật', href: '#', isActive: false, disabled: true },
  ];

  const sections = [];
  if (isAdmin) {
    sections.push({ title: 'QUẢN TRỊ', items: adminSections });
    sections.push({ title: 'TÀI KHOẢN', items: accountSections });
  } else {
    sections.push({ items: accountSections });
  }

  return (
    <div className="flex flex-1 flex-col bg-paper md:flex-row">
      <SharedSidebar
        sections={sections}
        showEditorial={!isAdmin}
        sessionEmail={isAdmin ? sessionEmail : undefined}
      />

      <section
        className={
          isAdmin
            ? 'flex-1 px-[clamp(20px,3vw,48px)] pt-9 pb-14'
            : 'flex-1 px-md py-10 md:px-lg'
        }
      >
        <div className="mx-auto w-full">{children}</div>
      </section>
    </div>
  );
}
