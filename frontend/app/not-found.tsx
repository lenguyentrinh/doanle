import Link from 'next/link';
import SearchBar from '@/components/ui/SearchBar';
import SwatchRail from '@/features/misc/components/SwatchRail';
import CurrentPathLabel from '@/features/misc/components/CurrentPathLabel';

const TICKER_ITEMS = ['Áo linen', 'Váy lụa', 'Đầm cotton', 'Khăn nhuộm củ nâu', 'Túi vải thô', 'Gốm nung'];

// Branded 404, used for unknown routes and `notFound()` calls (e.g. unknown
// category). The swatch rail is the store shelf; the dashed, text-stroked
// slot is the missing page.
export default function NotFound() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-paper py-[clamp(28px,5vw,72px)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[14%] -top-[24%] aspect-square w-[56vw] rounded-full bg-sand opacity-[.55] blur-[110px] motion-safe:animate-drift motion-reduce:animate-none"
        style={{ animationDuration: '38s' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[30%] -right-[16%] aspect-square w-[52vw] rounded-full bg-olive-soft opacity-[.24] blur-[120px] motion-safe:animate-drift motion-reduce:animate-none"
        style={{ animationDuration: '52s', animationDirection: 'reverse' }}
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-[clamp(28px,4vw,48px)] px-[clamp(18px,3.4vw,44px)] py-[clamp(20px,3vw,40px)]">
        <div className="flex flex-col items-center gap-4 text-center motion-safe:animate-rise motion-reduce:animate-none">
          <span className="inline-flex items-center gap-2.5 rounded-full bg-alert-bg px-[15px] py-[7px] text-label-xs text-alert">
            <span aria-hidden className="size-[5px] rounded-full bg-alert motion-safe:animate-nf-pulse motion-reduce:animate-none" />
            Lỗi 404 · trang đã rời kệ
          </span>
          <h1 className="max-w-[22ch] text-pretty font-display text-[clamp(34px,5.4vw,76px)] font-medium leading-[1.02] tracking-[-0.026em] text-ink">
            Món này không còn <em className="not-italic text-accent">trên kệ</em>
          </h1>
          <p className="max-w-[46ch] text-pretty text-body-md text-ink-secondary">
            Có thể đường dẫn đã đổi, hoặc sản phẩm bạn tìm đã bán hết và được gỡ khỏi cửa hàng. Thử tìm lại hoặc chọn một kệ khác.
          </p>
        </div>

        <SwatchRail />

        <div className="flex w-full max-w-[560px] flex-col gap-3.5 motion-safe:animate-rise motion-reduce:animate-none [animation-delay:500ms]">
          <SearchBar variant="pill" submitLabel="Tìm" placeholder="Tìm món bạn đang cần…" />

          <div className="flex flex-wrap justify-center gap-2.5 max-sm:flex-col max-sm:items-stretch">
            <Link
              href="/"
              className="inline-flex min-h-[50px] items-center justify-center rounded-full bg-ink px-7 py-3.5 text-label-xs text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[2px] hover:bg-accent hover:shadow-btn-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Về trang chủ
            </Link>
            <Link
              href="/products"
              className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-line-strong px-7 py-3.5 text-label-xs text-ink transition-all duration-300 hover:-translate-y-[2px] hover:border-accent hover:bg-fill hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Xem tất cả sản phẩm
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <CurrentPathLabel />
            <span aria-hidden className="size-[3px] rounded-full bg-line-strong" />
            <Link
              href="/orders"
              className="text-label-xs text-ink-secondary transition-colors duration-200 hover:text-accent"
            >
              Đơn hàng của tôi
            </Link>
            <a
              href="mailto:hello@oren.store"
              className="text-label-xs text-ink-secondary transition-colors duration-200 hover:text-accent"
            >
              Liên hệ
            </a>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="relative z-10 overflow-hidden border-t border-line py-4 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]"
      >
        <div className="flex w-max motion-safe:animate-marquee motion-reduce:animate-none">
          {[0, 1].map((copy) => (
            <span key={copy} className="flex gap-[22px] whitespace-nowrap pr-[22px]">
              {TICKER_ITEMS.map((item) => (
                <span key={item} className="flex items-center gap-[22px] font-display text-[18px] italic text-ink-muted">
                  {item}
                  <span className="text-accent">◦</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
