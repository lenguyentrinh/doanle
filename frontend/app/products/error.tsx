'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { buttonPrimary, buttonSecondary } from '@/components/Button';

// PLP route error boundary â€” a fetch failure shows a retry, not a crash.
export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-5 text-center">
      <h1 className="text-display-md text-ink">Không thể tải danh sách sản phẩm</h1>
      <p className="text-body-md text-ink-muted">Vui lòng thử lại sau ít phút.</p>
      <div className="flex flex-wrap items-center justify-center gap-4 max-sm:w-full max-sm:flex-col max-sm:items-stretch">
        <button
          type="button"
          onClick={reset}
          className={buttonPrimary}
        >
          Thử lại
        </button>
        <Link
          href="/"
          className={buttonSecondary}
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
