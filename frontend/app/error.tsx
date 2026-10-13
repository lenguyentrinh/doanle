'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { buttonPrimary } from '@/components/Button';
import StitchLine from '@/features/misc/components/StitchLine';

// Root error boundary: catches unexpected render/fetch throws so a failure
// never white-screens the page (AC #7).
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isRetrying, startRetry] = useTransition();
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    // Surface the failure for diagnostics (swap for telemetry when available).
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-[clamp(26px,3.4vw,40px)] overflow-hidden px-[clamp(18px,3.4vw,44px)] py-[clamp(40px,6vw,96px)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[12%] -top-[22%] aspect-square w-[50vw] rounded-full bg-error-bg opacity-90 blur-[110px] motion-safe:animate-drift motion-reduce:animate-none"
        style={{ animationDuration: '42s' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[26%] -left-[14%] aspect-square w-[46vw] rounded-full bg-sand opacity-50 blur-[120px] motion-safe:animate-drift motion-reduce:animate-none"
        style={{ animationDuration: '56s', animationDirection: 'reverse' }}
      />

      <div className="relative z-10 flex flex-col items-center gap-4 text-center motion-safe:animate-rise motion-reduce:animate-none">
        <span className="inline-flex items-center gap-2.5 rounded-full bg-error-bg px-[15px] py-[7px] text-label-xs text-error-strong">
          <span aria-hidden className="size-[5px] rounded-full bg-error-strong motion-safe:animate-nf-pulse motion-reduce:animate-none" />
          Lỗi hệ thống · đã ghi nhận
        </span>
        <h1 className="max-w-[24ch] text-pretty font-display text-[clamp(32px,4.8vw,66px)] font-medium leading-[1.02] tracking-[-0.024em] text-ink">
          Đã có <em className="not-italic text-accent">lỗi</em> xảy ra
        </h1>
        <p className="max-w-[44ch] text-pretty text-body-md text-ink-secondary">
          Không thể tải trang này. Vui lòng thử lại — đơn hàng và giỏ hàng của bạn không bị ảnh hưởng.
        </p>
      </div>

      <div className="relative z-10 w-full max-w-[520px]">
        <StitchLine />
      </div>

      <div className="relative z-10 flex w-full max-w-[520px] flex-col items-center gap-[18px] motion-safe:animate-rise motion-reduce:animate-none [animation-delay:280ms]">
        <div className="flex flex-wrap justify-center gap-3 max-sm:w-full max-sm:flex-col max-sm:items-stretch">
          <button
            type="button"
            onClick={() => startRetry(() => reset())}
            disabled={isRetrying}
            className={buttonPrimary}
          >
            {isRetrying ? 'Đang tải lại' : 'Thử lại'}
            {isRetrying && (
              <span
                aria-hidden
                className="size-[13px] rounded-full border-[1.5px] border-white/35 border-t-white motion-safe:animate-spin"
              />
            )}
          </button>
          <Link
            href="/"
            className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-line-strong px-8 py-4 text-label-sm text-ink transition-all duration-300 hover:-translate-y-[2px] hover:border-accent hover:bg-fill hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Về trang chủ
          </Link>
        </div>

        <div className="flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            aria-expanded={detailsOpen}
            className="inline-flex items-center gap-2.5 self-center text-caption text-ink-muted transition-colors duration-200 hover:text-accent"
          >
            {detailsOpen ? 'Ẩn chi tiết kỹ thuật' : 'Xem chi tiết kỹ thuật'}
            <svg
              aria-hidden
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${detailsOpen ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {detailsOpen && (
            <div className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-fill px-[18px] py-4 motion-safe:animate-rise motion-reduce:animate-none [animation-duration:0.3s]">
              <div className="flex flex-wrap items-baseline justify-between gap-2.5">
                <span className="text-label-xs text-ink-muted">Mã lỗi</span>
                <span className="text-[13px] leading-[1.5] tracking-[.06em] tabular-nums text-ink">
                  {error.digest ?? '—'}
                </span>
              </div>
              <span aria-hidden className="h-px w-full bg-line" />
              {error.message ? (
                <p className="break-words text-pretty text-caption text-ink-secondary">{error.message}</p>
              ) : (
                <p className="text-pretty text-caption text-ink-secondary">
                  Chi tiết lỗi đã được ẩn ở môi trường production — dùng mã lỗi bên trên để tra cứu.
                </p>
              )}
              <p className="text-pretty text-[11.5px] text-ink-faint">
                Gửi mã lỗi này kèm thời điểm gặp lỗi cho{' '}
                <a
                  href="mailto:hello@oren.store"
                  className="text-ink-muted underline decoration-line underline-offset-[3px] transition-colors duration-200 hover:text-accent hover:decoration-accent"
                >
                  hello@oren.store
                </a>{' '}
                nếu vẫn lặp lại.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
