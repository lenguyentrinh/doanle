'use client';

import Link from 'next/link';
import { useState } from 'react';
import { showToast } from '@/lib/toast';

const columns = [
  {
    heading: 'Mua sắm',
    links: [
      { label: 'Tất cả sản phẩm', href: '/products' },
      { label: 'Hàng mới về', href: '/products?sort=newest' },
      { label: 'Về Oren', href: '/about-me' },
    ],
  },
  {
    heading: 'Tài khoản',
    links: [
      { label: 'Đăng nhập', href: '/login' },
      { label: 'Tạo tài khoản', href: '/signup' },
      { label: 'Đơn hàng', href: '/orders' },
    ],
  },
  {
    heading: 'Hỗ trợ',
    links: [
      { label: 'Liên hệ', href: 'mailto:hello@oren.store' },
      { label: 'Vận chuyển', href: '/about-me' },
      { label: 'Đổi trả', href: '/about-me' },
    ],
  },
];

const PAY_CHIPS = ['COD', 'Chuyển khoản', 'Giao 2–5 ngày', 'Đổi trả 7 ngày'];

// Ink slab footer — the dark anchor that closes every page. Newsletter band,
// brand + link columns, a trust-chip bar, then a giant faint "OREN" wordmark
// clipped edge-to-edge sitting right above the copyright line. Rounded top
// corners so it reads as a rest, not an edge.
export default function Footer() {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return;
    showToast.success('Cảm ơn — bạn đã đăng ký nhận bản tin');
    setEmail('');
  };

  return (
    <footer className="relative overflow-hidden rounded-t-[clamp(20px,2.4vw,32px)] bg-ink text-white">
      <div className="relative mx-auto max-w-[1480px] px-[clamp(16px,3.4vw,44px)]">
        {/* Newsletter */}
        <div className="flex flex-col gap-5 border-b border-white/15 pt-[clamp(40px,5vw,76px)] pb-[clamp(32px,4vw,56px)] md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="flex flex-col gap-3">
            <span className="text-label-xs text-accent-soft">Bản tin</span>
            <h2 className="font-display text-[clamp(28px,3.4vw,46px)] font-medium leading-[1.16] tracking-[-0.02em] text-white">
              Biết trước <em className="text-accent-soft">hàng về thứ Năm</em>
            </h2>
          </div>
          <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Địa chỉ email của bạn"
                aria-label="Địa chỉ email của bạn"
                className="h-12 w-full min-w-[240px] border-0 border-b border-white/25 bg-transparent px-1 text-body-md text-white outline-none placeholder:text-white/40 focus:border-accent-soft"
              />
              <button
                type="submit"
                aria-label="Đăng ký"
                className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-accent text-white transition-colors duration-200 hover:bg-accent-soft hover:text-ink"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M5 12h13" />
                  <path d="M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
            <p className="text-caption text-white/40">Mỗi tuần một thư. Huỷ bất cứ lúc nào.</p>
          </form>
        </div>

        {/* Brand + link columns */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 py-[clamp(32px,4vw,56px)] sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
          <div className="col-span-2 flex max-w-[280px] flex-col gap-3 sm:col-span-1">
            <span className="text-label-xs text-white/40">Liên hệ</span>
            <p className="text-body-sm leading-relaxed text-white/75">
              48 Lý Tự Trọng, Quận 1
              <br />
              Hồ Chí Minh
            </p>
            <a
              href="mailto:hello@oren.store"
              className="text-body-sm text-white/75 transition-colors duration-200 hover:text-accent-soft"
            >
              hello@oren.store
            </a>
          </div>
          {columns.map((col) => (
            <nav key={col.heading} className="flex flex-col gap-4">
              <span className="text-label-xs text-white/40">{col.heading}</span>
              {col.links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-body-sm text-white/75 transition-colors duration-200 hover:text-accent-soft focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        {/* Trust chips + quick links */}
        <div className="flex flex-col gap-6 border-t border-white/15 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2.5">
            {PAY_CHIPS.map((chip) => (
              <span
                key={chip}
                className="whitespace-nowrap rounded-full border border-white/16 px-3.5 py-1.5 text-label-xs text-white/60"
              >
                {chip}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-5">
            <Link href="/login" className="whitespace-nowrap text-label-xs text-white/40 transition-colors duration-200 hover:text-accent-soft">
              Đăng nhập
            </Link>
            <Link href="/admin" className="whitespace-nowrap text-label-xs text-white/40 transition-colors duration-200 hover:text-accent-soft">
              Quản trị
            </Link>
          </div>
        </div>
      </div>

      {/* Giant clipped wordmark sitting right above the copyright line — not a
          background watermark behind the content above. */}
      <div className="relative mx-auto max-w-[1480px] px-[clamp(16px,3.4vw,44px)]">
        <span
          aria-hidden
          className="block select-none whitespace-nowrap text-center font-display text-[clamp(72px,17vw,260px)] font-medium leading-[0.78] tracking-[0.02em] text-white/[0.07]"
        >
          OREN
        </span>
        <p className="pt-3.5 pb-[22px] text-center text-label-xs text-white/40">
          © {new Date().getFullYear()} Oren · Bảo lưu mọi quyền
        </p>
      </div>
    </footer>
  );
}
