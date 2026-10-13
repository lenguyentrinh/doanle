'use client';

import Link from 'next/link';
import ProductImage from '@/components/ProductImage';
import { PRODUCT_IMAGE_FALLBACK } from '@/lib/productImage';
import type { Product } from '@/types/product';
import {
  BuyButton,
  CloseButton,
  Counter,
  DiscountChip,
  NavButton,
  OldPrice,
  PriceText,
  stockInfo,
} from './QuickViewParts';

export interface QuickViewViewProps {
  product: Product;
  index: number;
  total: number;
  onClose: () => void;
  onStep: (delta: 1 | -1) => void;
}

const TAG_CLIP_DESKTOP = 'polygon(50px 0, calc(100% - 50px) 0, 100% 50px, 100% 100%, 0 100%, 0 50px)';
const TAG_CLIP_MOBILE = 'polygon(40px 0, calc(100% - 40px) 0, 100% 40px, 100% 100%, 0 100%, 0 40px)';

function TagHole({ size }: { size: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, left: `calc(50% - ${size / 2}px)` }}
      className="absolute top-3 rounded-full bg-[#3a2e26] shadow-[inset_0_2px_4px_rgba(0,0,0,.5),0_0_0_4px_#f2e6d5]"
    />
  );
}

function TagBody({ product, mobile, onClose }: { product: Product; mobile: boolean; onClose: () => void }) {
  const stock = stockInfo(product);
  return (
    <div className={`flex flex-col ${mobile ? 'gap-2.5' : 'gap-3'}`}>
      <div className="flex items-center justify-between">
        <span className="font-display text-[15px] uppercase tracking-[0.32em] text-ink">Oren</span>
        <span className="text-label-xs text-accent">{product.category}</span>
      </div>
      <h2 className={`font-display font-medium leading-[1.1] tracking-[-0.015em] text-ink ${mobile ? 'text-[24px]' : 'text-[25px]'}`}>
        {product.name}
      </h2>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5 border-y border-dashed border-line-strong py-3">
        <PriceText product={product} className={`italic ${mobile ? 'text-[24px]' : 'text-[25px]'}`} />
        <OldPrice product={product} />
        <DiscountChip product={product} />
        {mobile && <span className={`ml-auto text-[11.5px] ${stock.cls}`}>{stock.label}</span>}
      </div>
      <p className={`text-body-sm leading-[1.65] text-ink-secondary ${mobile ? 'line-clamp-2 [@media(max-height:700px)]:hidden' : ''}`}>
        {product.description}
      </p>
      {!mobile && (
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3.5 text-[12px]">
          <dt className="text-[10px] uppercase tracking-[0.18em] text-ink-muted">Tình trạng</dt>
          <dd className={stock.cls}>{stock.label}</dd>
        </dl>
      )}
      <BuyButton product={product} className={`w-full ${mobile ? 'min-h-[48px]' : ''}`} />
      <Link
        href={`/products/${product.id}`}
        onClick={onClose}
        className="self-center max-md:self-stretch max-md:py-2 max-md:text-center font-display text-[15px] italic text-ink-secondary underline decoration-line-strong underline-offset-4 hover:text-accent"
      >
        Xem chi tiết →
      </Link>
    </div>
  );
}

export default function QuickViewTag({ product, index, total, onClose, onStep }: QuickViewViewProps) {
  const hasNav = total > 1;
  const src = product.imageUrls?.[0] ?? PRODUCT_IMAGE_FALLBACK;
  const outOfStock = product.stockQuantity <= 0;
  const photo = (
    <>
      <ProductImage
        src={src}
        alt={product.name}
        fill
        sizes="(max-width: 767px) 90vw, 440px"
        className={`object-cover object-[center_20%] ${outOfStock ? 'opacity-70' : ''}`}
      />
      <DiscountChip product={product} className="absolute left-3 top-3 z-10" />
    </>
  );

  return (
    <>
      {/* Desktop */}
      <div className="pointer-events-none absolute inset-0 hidden items-center justify-center p-[clamp(16px,4vw,48px)] md:flex">
        <div key={product.id} className="pointer-events-auto relative flex w-fit max-w-[90vw] items-start motion-safe:animate-rise">
          <div className="relative aspect-[2/3] h-[min(660px,82vh)] shrink-0 overflow-hidden rounded-[14px] bg-sand shadow-[0_40px_80px_-30px_rgba(0,0,0,.55)]">
            {photo}
            <span aria-hidden className="absolute right-[26px] top-[22px] z-20 size-3.5 rounded-full bg-white shadow" />
          </div>
          <svg
            aria-hidden
            width="120"
            height="70"
            className="pointer-events-none absolute top-[29px] z-30 overflow-visible"
            style={{ left: 'calc(min(660px, 82vh) * 2 / 3 - 33px)' }}
          >
            <path d="M0 0 C 25 45, 75 20, 109 66" fill="none" stroke="#c6b49a" strokeWidth="1.6" />
          </svg>
          <div className="relative z-20 -ml-[60px] mt-20 w-[272px] drop-shadow-[0_26px_30px_rgba(0,0,0,.35)]">
            <div className="origin-[50%_22px] [transform:rotate(-3.5deg)] motion-safe:animate-qv-swing motion-safe:transition-transform motion-safe:duration-[900ms] motion-safe:ease-[cubic-bezier(0.34,1.4,0.5,1)] hover:[transform:rotate(0)] focus-within:[transform:rotate(0)]">
              <div className="relative bg-auth-ground px-[26px] pb-[22px] pt-[54px]" style={{ clipPath: TAG_CLIP_DESKTOP }}>
                <TagHole size={22} />
                <span aria-hidden className="pointer-events-none absolute inset-x-3 bottom-3 top-12 rounded-[3px] border border-dashed border-line-strong" />
                <div className="relative">
                  <TagBody product={product} mobile={false} onClose={onClose} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <Counter index={index} total={total} className="pointer-events-none absolute left-10 top-11 text-[16px] text-white/75" />
        <div className="pointer-events-auto absolute right-10 top-9 flex items-center gap-3">
          <span className="text-label-xs text-white/85">Đóng</span>
          <CloseButton onClick={onClose} className="size-9" />
        </div>
        {hasNav && (
          <>
            <NavButton dir="prev" onClick={() => onStep(-1)} className="pointer-events-auto absolute left-10 top-1/2 size-14 -translate-y-1/2" />
            <NavButton dir="next" onClick={() => onStep(1)} className="pointer-events-auto absolute right-10 top-1/2 size-14 -translate-y-1/2" />
          </>
        )}
      </div>

      {/* Mobile */}
      <div className="absolute inset-0 flex flex-col md:hidden">
        <div className="flex items-center justify-between px-5 pt-[max(16px,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2.5">
            {hasNav && <NavButton dir="prev" onClick={() => onStep(-1)} className="size-11" />}
            <Counter index={index} total={total} className="text-[14px] text-white/75" />
            {hasNav && <NavButton dir="next" onClick={() => onStep(1)} className="size-11" />}
          </div>
          <CloseButton onClick={onClose} className="size-11" />
        </div>
        <div key={product.id} className="min-h-0 flex-1 overflow-y-auto pb-6 motion-safe:animate-rise">
          <div className="relative mx-6 mt-4 h-[min(400px,48vh)] overflow-hidden rounded-[14px] bg-sand shadow-[0_30px_60px_-24px_rgba(0,0,0,.55)]">
            {photo}
          </div>
          <div className="mx-auto flex w-3 flex-col items-center">
            <span aria-hidden className="-mt-1.5 size-3 rounded-full bg-white shadow" />
            <span aria-hidden className="h-[30px] w-[1.5px] bg-[#c6b49a]" />
          </div>
          <div className="mx-7 drop-shadow-[0_22px_26px_rgba(0,0,0,.35)]">
            <div className="origin-[50%_18px] [transform:rotate(-1.5deg)] motion-safe:animate-qv-swing-m motion-safe:transition-transform motion-safe:duration-[900ms] hover:[transform:rotate(0)] focus-within:[transform:rotate(0)]">
              <div className="relative bg-auth-ground px-[22px] pb-5 pt-11" style={{ clipPath: TAG_CLIP_MOBILE }}>
                <TagHole size={18} />
                <span aria-hidden className="pointer-events-none absolute inset-x-3 bottom-3 top-10 rounded-[3px] border border-dashed border-line-strong" />
                <div className="relative">
                  <TagBody product={product} mobile onClose={onClose} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
