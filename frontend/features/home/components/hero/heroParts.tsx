'use client';

import { createContext, useContext } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { buttonBase, buttonPrimary, buttonSecondary } from '@/components/Button';
import type { HeroCta } from '../../types/homeHero';

const ARROW = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
    <path d="M7 17L17 7" />
    <path d="M8 7h9v9" />
  </svg>
);

// Admin preview only: lets the editor turn hero text into click-to-edit targets.
// The storefront never provides it, so the parts render exactly as before.
export type HeroEditField = 'eyebrow' | 'title' | 'subtitle';
export const HeroEditContext = createContext<((field: HeroEditField) => void) | null>(null);

const EDITABLE_CLS =
  'cursor-text rounded-md outline-2 outline-dashed outline-transparent outline-offset-[10px] transition-[outline-color] hover:outline-accent/60';

function useEditProps(field: HeroEditField, onEdit?: () => void) {
  const ctx = useContext(HeroEditContext);
  const handler = onEdit ?? (ctx ? () => ctx(field) : undefined);
  return handler ? { onClick: handler, extraCls: EDITABLE_CLS } : { onClick: undefined, extraCls: '' };
}

// Light = on the paper background; dark = over a photo/overlay.
export type HeroTone = 'light' | 'dark';

const DARK_PRIMARY = `${buttonBase} bg-white text-ink shadow-btn hover:bg-accent hover:text-white motion-safe:hover:-translate-y-0.5`;
const DARK_SECONDARY = `${buttonBase} border border-white/70 bg-transparent text-white hover:bg-white/15 motion-safe:hover:-translate-y-0.5`;

export function HeroEyebrow({
  text,
  tone = 'light',
  onEdit,
}: {
  text: string;
  tone?: HeroTone;
  onEdit?: () => void;
}) {
  const edit = useEditProps('eyebrow', onEdit);
  if (!text) return null;
  const cls =
    tone === 'light'
      ? 'bg-fill text-accent-strong'
      : 'bg-white/15 text-white backdrop-blur-sm';
  return (
    <span
      onClick={edit.onClick}
      className={`motion-safe:animate-fade-up inline-flex w-fit max-w-full items-center gap-2.5 rounded-full px-[18px] py-2.5 text-label-xs ${cls} ${edit.extraCls}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent motion-safe:animate-pulse" />
      <span className="truncate">{text}</span>
    </span>
  );
}

// A newline in the title breaks the line; with 2+ lines the last one is set
// in the accent italic (matches the original "Chúng tôi lựa, / bạn chỉ việc mặc").
export function HeroTitle({
  text,
  tone = 'light',
  size = 'md',
  className = '',
  onEdit,
}: {
  text: string;
  tone?: HeroTone;
  size?: 'md' | 'xl';
  className?: string;
  onEdit?: () => void;
}) {
  const edit = useEditProps('title', onEdit);
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  const sizeCls =
    size === 'xl'
      ? 'text-[clamp(40px,7vw,104px)]'
      : 'text-[clamp(34px,4.6vw,72px)]';
  const color = tone === 'light' ? 'text-ink' : 'text-white';
  const accent = tone === 'light' ? 'text-accent' : 'text-white/85';
  return (
    <h1
      onClick={edit.onClick}
      className={`motion-safe:animate-fade-up motion-safe:[animation-delay:90ms] font-display font-medium leading-[0.96] tracking-[-0.026em] ${sizeCls} ${color} ${className} ${edit.extraCls}`}
    >
      {lines.map((line, i) => {
        const isLast = i === lines.length - 1;
        return (
          <span key={i}>
            {lines.length > 1 && isLast ? <em className={accent}>{line}</em> : line}
            {!isLast && <br />}
          </span>
        );
      })}
    </h1>
  );
}

export function HeroSubtitle({
  text,
  tone = 'light',
  className = '',
  onEdit,
}: {
  text: string;
  tone?: HeroTone;
  className?: string;
  onEdit?: () => void;
}) {
  const edit = useEditProps('subtitle', onEdit);
  if (!text) return null;
  return (
    <p
      onClick={edit.onClick}
      className={`motion-safe:animate-fade-up motion-safe:[animation-delay:170ms] max-w-[38ch] text-[17px] leading-[1.72] ${
        tone === 'light' ? 'text-ink-secondary' : 'text-white/90'
      } ${className} ${edit.extraCls}`}
    >
      {text}
    </p>
  );
}

export function HeroCtas({
  primary,
  secondary,
  tone = 'light',
  className = '',
}: {
  primary: HeroCta;
  secondary: HeroCta;
  tone?: HeroTone;
  className?: string;
}) {
  const p = tone === 'light' ? buttonPrimary : DARK_PRIMARY;
  const s = tone === 'light' ? buttonSecondary : DARK_SECONDARY;
  return (
    <div
      className={`motion-safe:animate-fade-up motion-safe:[animation-delay:250ms] flex flex-wrap gap-3.5 ${className}`}
    >
      {primary.label && primary.href && (
        <Link href={primary.href} className={`${p} whitespace-nowrap`}>
          {primary.label}
          {ARROW}
        </Link>
      )}
      {secondary.label && secondary.href && (
        <Link href={secondary.href} className={`${s} whitespace-nowrap`}>
          {secondary.label}
        </Link>
      )}
    </div>
  );
}

// Absolute (uploaded/CDN) URLs skip the optimizer so an un-allow-listed host
// can never crash the home page; local /images/* still get optimized.
export function HeroImage({
  src,
  priority = false,
  sizes,
  className = '',
}: {
  src: string;
  priority?: boolean;
  sizes: string;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt=""
      fill
      priority={priority}
      sizes={sizes}
      unoptimized={/^https?:\/\//i.test(src)}
      className={`object-cover ${className}`}
    />
  );
}

const SPLIT_TITLE_CLS =
  'font-display font-medium text-[clamp(44px,6.2vw,80px)] leading-[1.04] tracking-[-0.03em] text-balance';

// Title for the "Sân khấu" layout: one semantic h1, visually split in two —
// `lead` (every line but the last) on the left, the accent last line `tail`
// is rendered by <HeroSplitTail/> on the other side of the photo.
export function HeroSplitLead({ text, onEdit }: { text: string; onEdit?: () => void }) {
  const edit = useEditProps('title', onEdit);
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  const lead = lines.length > 1 ? lines.slice(0, -1) : lines;
  const tail = lines.length > 1 ? lines[lines.length - 1] : '';
  return (
    <h1
      onClick={edit.onClick}
      aria-label={lines.join(' ')}
      className={`motion-safe:animate-fade-up motion-safe:[animation-delay:90ms] text-ink ${SPLIT_TITLE_CLS} ${edit.extraCls}`}
    >
      <span aria-hidden>
        {lead.map((line, i) => (
          <span key={i}>
            {line}
            {i < lead.length - 1 && <br />}
          </span>
        ))}
      </span>
      {tail && <span className="sr-only">{tail}</span>}
    </h1>
  );
}

export function HeroSplitTail({ text, onEdit }: { text: string; onEdit?: () => void }) {
  const edit = useEditProps('title', onEdit);
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  if (lines.length < 2) return null;
  return (
    <span
      aria-hidden
      onClick={edit.onClick}
      className={`motion-safe:animate-fade-up motion-safe:[animation-delay:130ms] block italic text-accent ${SPLIT_TITLE_CLS} ${edit.extraCls}`}
    >
      {lines[lines.length - 1]}
    </span>
  );
}
