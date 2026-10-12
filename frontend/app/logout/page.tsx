'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { buttonPrimary } from '@/components/Button';
import { AppDispatch } from '@/store/store';
import { logoutThunk } from '@/features/auth/store/authThunk';

export default function LogoutPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  useEffect(() => {
    dispatch(logoutThunk()).then(() => {
      router.replace('/');
    });
  }, [dispatch, router]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-5 py-24 text-center">
      <h1 className="text-display-lg text-ink">Đăng xuất</h1>
      <p className="text-body-md text-ink-muted">Đang đăng xuất...</p>
      <Link
        href="/login"
        className={`mt-4 ${buttonPrimary}`}
      >
        Đến trang đăng nhập
      </Link>
    </main>
  );
}
