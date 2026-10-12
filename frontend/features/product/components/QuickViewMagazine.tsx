'use client';

import Link from 'next/link';
import ProductImage from '@/components/ProductImage';
import { PRODUCT_IMAGE_FALLBACK } from '@/lib/productImage';
import { BuyButton, CloseButton, DiscountChip, OldPrice, PriceText, stockInfo } from './QuickViewParts';
import type { QuickViewViewProps } from './QuickViewTag';

// Last two words of the name in accent italic.
function MagazineTitle({ name, className }: { name: string; className: string }) {
  const words = name.split(' ');
  const head = words.slice(0, -2).join(' ');
  const tail = words.slice(-2).join(' ');
  return (
    <h2 className={`font-display font-normal leading-[1.02] tracking-[-0.03em] text-ink text-balance [overflow-wrap:anywhere] ${className}`}>
      {head}
      {head && ' '}
      <em className="italic text-accent">{tail}</em>
    </h2>
  );
}

function PageCurl({ label, className, onClick }: { label: string; className: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Lật sang trang sau"
      style={{ background: 'linear-gradient(135deg, transparent 50%, #3a2e26 50%)' }}
      className={`absolute bottom-0 right-0 z-10 transition-all duration-[350ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      <span
        aria-hidden
        style={{ background: 'linear-gradient(315deg, #fbf7f1 0%, #f2e6d5 48%, transparent 50%)' }}
        className="absolute inset-0 shadow-[-6px_-6px_14px_-6px_rgba(0,0,0,.25)]"
      />
      <span className="absolute bottom-2 right-2 font-display text-[12px] italic text-ink-secondary">{label} →</span>
    </button>
  );
}

export default function QuickViewMagazine({ product, index, total, onClose, onStep }: QuickViewViewProps) {
  const hasNav = total > 1;
  const stock = stockInfo(product);
  const src = product.imageUrls?.[0] ?? PRODUCT_IMAGE_FALLBACK;
  const leftPage = 12 + index * 2;
  const rightPage = 13 + index * 2;
  const imageCls = `object-cover object-[center_20%] ${product.stockQuantity <= 0 ? 'opacity-70' : ''}`;

  const quote = (clamp: string) => (
    <div className="flex gap-4">
      <span aria-hidden className="font-display text-[64px] leading-[.8] text-accent-soft">“</span>
      <p className={`font-display italic leading-[1.5] text-ink-secondary ${clamp}`}>{product.description}</p>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="pointer-events-none absolute inset-0 hidden items-center justify-center md:flex">
        <div
          key={product.id}
          className="pointer-events-auto relative grid h-[min(680px,86vh)] w-[min(1140px,92vw)] grid-cols-2 overflow-hidden rounded-md bg-auth-ground shadow-[0_50px_100px_-30px_rgba(0,0,0,.6)] motion-safe:animate-qv-flip"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-[calc(50%-40px)] z-[2] w-20"
            style={{
              background:
                'linear-gradient(to right, transparent, rgba(63,49,40,.10) 48%, rgba(63,49,40,.16) 50%, rgba(63,49,40,.10) 52%, transparent)',
            }}
          />
          <div className="relative flex min-h-0 flex-col overflow-hidden pb-10 pl-[52px] pr-14 pt-11">
            <div className="flex items-center justify-between">
              <span className="text-label-xs text-ink-muted">Oren — tuyển chọn tuần này</span>
              <span className="text-label-xs text-accent">{product.category}</span>
            </div>
            <MagazineTitle name={product.name} className="mt-[clamp(20px,6vh,56px)] text-[clamp(40px,4.6vw,68px)]" />
            <div className="mt-8 max-w-[400px] text-[20px]">{quote('line-clamp-4')}</div>
            <div className="mt-auto flex flex-col gap-[18px] pb-6">
              <div className="flex items-baseline gap-3.5 border-t border-line-strong pt-[18px]">
                <span className="text-label-xs text-ink-muted">Giá</span>
                <PriceText product={product} className="text-[28px]" />
                <OldPrice product={product} />
                <DiscountChip product={product} />
                <span className={`ml-auto text-[12.5px] ${stock.cls}`}>{stock.label}</span>
              </div>
              <div className="flex gap-3">
                <BuyButton product={product} className="min-h-[54px] flex-1" />
                <Link
                  href={`/products/${product.id}`}
                  onClick={onClose}
                  className="flex min-h-[54px] items-center justify-center rounded-full border border-line-strong px-7 text-label-sm text-ink transition-colors hover:border-ink hover:bg-fill"
                >
                  Chi tiết
                </Link>
              </div>
            </div>
            <span className="absolute bottom-3 left-[52px] font-display text-[13px] italic text-ink-muted">← trang {leftPage}</span>
          </div>

          <div className="relative overflow-hidden rounded-r-md bg-sand">
            <ProductImage src={src} alt={product.name} fill sizes="570px" className={imageCls} />
            <div className="absolute bottom-5 left-6 flex flex-col text-white [text-shadow:0_1px_8px_rgba(0,0,0,.45)]">
              <span className="font-display text-[15px] italic">{product.name}</span>
              <span className="text-[10px] tracking-[0.2em]">THU — ĐÔNG 2026</span>
            </div>
          </div>
          {hasNav && <PageCurl label={`trang ${rightPage}`} className="size-[84px] hover:size-[104px]" onClick={() => onStep(1)} />}
        </div>
        <CloseButton onClick={onClose} className="pointer-events-auto absolute right-10 top-9 size-9" />
      </div>

      {/* Mobile */}
      <div key={product.id} className="absolute inset-0 flex flex-col overflow-y-auto bg-auth-ground md:hidden">
        <div className="relative h-[min(420px,50vh)] shrink-0 bg-sand">
          <ProductImage src={src} alt={product.name} fill sizes="100vw" className={imageCls} />
          <span aria-hidden className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />
          <span className="absolute left-5 top-[max(20px,env(safe-area-inset-top))] text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
            Oren — tuyển chọn tuần này
          </span>
          <CloseButton onClick={onClose} className="absolute right-4 top-[max(12px,env(safe-area-inset-top))] size-10" />
          <span className="absolute bottom-4 left-5 font-display text-[13px] italic text-white [text-shadow:0_1px_8px_rgba(0,0,0,.45)]">
            Thu — Đông 2026
          </span>
        </div>
        <div className="flex flex-1 flex-col p-[22px_22px_24px]">
          <span className="text-label-xs text-accent">{product.category}</span>
          <MagazineTitle name={product.name} className="mt-2 text-[38px]" />
          <div className="mt-4 text-[15.5px]">{quote('line-clamp-3')}</div>
          <div className="mt-auto flex flex-col gap-3.5 pt-6">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <PriceText product={product} className="text-[24px]" />
              <OldPrice product={product} />
              <span className={`ml-auto text-[12px] ${stock.cls}`}>{stock.label}</span>
            </div>
            <BuyButton product={product} className="min-h-[50px] w-full pr-14" />
            <Link href={`/products/${product.id}`} onClick={onClose} className="font-display text-[13px] italic text-ink-muted">
              Xem chi tiết · ← trang {leftPage}
            </Link>
          </div>
        </div>
        {hasNav && <PageCurl label={`${rightPage}`} className="!fixed size-[78px]" onClick={() => onStep(1)} />}
      </div>
    </>
  );
}
