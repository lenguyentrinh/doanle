import React from "react";
import Link from "next/link";
import Image from "next/image";

const RISE = "motion-safe:animate-[rise_0.8s_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none";
const RISE_DELAY_1 = "motion-safe:animate-[rise_0.8s_cubic-bezier(0.16,1,0.3,1)_0.1s_both] motion-reduce:animate-none";
// Exported so a page with a bespoke footer (e.g. login's signup CTA card)
// can stagger it the same way FooterRow does.
export const RISE_DELAY_2 = "motion-safe:animate-[rise_0.8s_cubic-bezier(0.16,1,0.3,1)_0.2s_both] motion-reduce:animate-none";

// Set to "/images/auth-lookbook.jpg" once the portrait lookbook photo is added
// to public/images/. Until then the arch frames render as a flat bg-fill-dark
// placeholder (no 404ing <Image>).
const LOOKBOOK_SRC: string | null = null;

// 14px spinning ring for a submit button's loading state.
export function Spinner() {
  return (
    <span
      aria-hidden
      className="h-[14px] w-[14px] rounded-full border-[1.5px] border-white/35 border-t-white motion-safe:animate-spin"
    />
  );
}

const footerLinkClass =
  "italic font-medium text-accent underline decoration-accent-soft underline-offset-4 transition-colors duration-200 hover:text-accent-strong focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2";

// Centered line under the submit button used by every screen except login
// (which gets the signup CTA card instead) and verify-email (which has two
// actions, not one). Pass `href` for a link, or `onClick` for an action
// (e.g. reopening the forgot-password tag).
export function FooterRow({
  prompt,
  href,
  label,
  onClick,
}: {
  prompt: string;
  href?: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <div className={`mt-[18px] text-center font-display text-[16px] text-ink-secondary ${RISE_DELAY_2}`}>
      {prompt}{" "}
      {href ? (
        <Link href={href} className={footerLinkClass}>
          {label}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={footerLinkClass}>
          {label}
        </button>
      )}
    </div>
  );
}

function StepIndicator({ step, totalSteps }: { step: number; totalSteps: number }) {
  return (
    <div className="mb-[18px] flex items-center gap-3" aria-label={`Bước ${step} / ${totalSteps}`}>
      <span className="text-label-xs text-accent">Khôi phục</span>
      <span aria-hidden className="h-px flex-1 bg-line" />
      <span className="font-display text-[14px] italic text-accent">
        bước {step}
        <span className="text-ink-faint"> / {totalSteps}</span>
      </span>
    </div>
  );
}

function Lookbook() {
  if (!LOOKBOOK_SRC) return null;
  return <Image fill priority sizes="440px" className="object-cover" src={LOOKBOOK_SRC} alt="" />;
}

const legalLinkClass =
  "text-[10px] font-[550] uppercase tracking-[0.18em] text-ink-muted transition-colors duration-200 hover:text-accent";

// Shared "magazine cover" layout for every pre-auth screen (login, signup,
// verify-email, forgot-password steps): flat cream ground, arch-framed
// lookbook photo on the left (md+), content column on the right and a huge
// italic "Oren" watermark sunk behind. Pages supply the heading and an
// optional footer; the form component itself is passed as children. Modal
// children (ForgotPasswordTag) are rendered by the form/footer components.
export default function AuthShell({
  eyebrow,
  title,
  titleBreak = false,
  subtitle,
  children,
  footer,
  step,
  totalSteps,
}: {
  eyebrow?: string;
  title?: React.ReactNode;
  /** Login-sized headline whose emphasised (<em>) part sits on its own line. */
  titleBreak?: boolean;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Current step in a multi-step flow (forgot-password's email → OTP →
   * reset). Omit for single-step flows like login/signup. */
  step?: number;
  totalSteps?: number;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-auth-ground">
      <span
        aria-hidden
        className="pointer-events-none fixed -left-10 bottom-[-0.33em] z-0 select-none font-display text-[clamp(220px,34vw,430px)] font-light italic leading-none tracking-[-0.04em] text-fill-dark"
      >
        Oren
      </span>

      <header className="relative z-[2] flex items-center justify-between gap-4 px-5 py-5 md:px-[clamp(24px,4.4vw,56px)] md:py-4">
        <Link href="/" className="font-display text-[20px] uppercase tracking-[0.34em] text-ink">
          Oren
        </Link>
        <div className="flex items-center gap-7">
          <span className="hidden font-display text-[14px] italic text-ink-muted md:inline">Thu — Đông 2026</span>
          <Link
            href="/"
            className="border-b border-line-strong pb-[3px] text-[10px] font-[550] uppercase tracking-[0.22em] text-ink transition-colors duration-200 hover:text-accent"
          >
            Cửa hàng
          </Link>
        </div>
      </header>

      <main className="relative z-[1] mx-auto grid w-full max-w-[1280px] flex-1 grid-cols-1 items-start px-5 pb-8 pt-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-[clamp(32px,7vw,124px)] md:px-[clamp(24px,4.4vw,56px)] md:pb-6 md:pt-0">
        <div className="sticky top-8 hidden w-full max-w-[440px] justify-self-end md:block">
          <div className="relative h-[clamp(320px,calc(100vh-260px),600px)]">
            <span aria-hidden className="absolute -right-[8%] -top-6 aspect-square w-1/2 rounded-full bg-sand" />
            <div className="absolute inset-0 overflow-hidden rounded-b-[12px] rounded-t-full bg-fill-dark">
              <Lookbook />
            </div>
          </div>
          <div className="mt-3.5 flex justify-between text-[11px] text-ink-muted">
            <span className="font-display text-[14px] italic">Áo khoác len, màu đất</span>
            <span className="tracking-[0.2em]">N° 014</span>
          </div>
        </div>

        <div className="w-full max-w-[470px] justify-self-center pt-3 md:justify-self-start md:pt-6">
          <div className={RISE}>
            {step && totalSteps ? (
              <StepIndicator step={step} totalSteps={totalSteps} />
            ) : (
              eyebrow && <span className="mb-4 block text-label-xs text-accent">{eyebrow}</span>
            )}
            {title && (
              <h1
                className={`m-0 mb-3.5 text-balance font-display font-normal leading-[1.06] tracking-[-0.03em] text-ink [&_em]:italic [&_em]:text-accent ${
                  titleBreak
                    ? "text-[52px] md:text-[76px] [&_em]:block"
                    : "text-[44px] md:text-[60px]"
                }`}
              >
                {title}
              </h1>
            )}
            {subtitle && <p className="text-pretty text-body-md text-ink-secondary">{subtitle}</p>}
          </div>

          <div className={`mt-9 md:mt-6 ${RISE_DELAY_1}`}>{children}</div>

          {footer}
        </div>
      </main>

      <footer className="relative z-[1] flex justify-end gap-[18px] px-5 pb-6 md:px-[clamp(24px,4.4vw,56px)] md:pb-2">
        <a href="#" className={legalLinkClass}>
          Điều khoản
        </a>
        <a href="#" className={legalLinkClass}>
          Bảo mật
        </a>
      </footer>
    </div>
  );
}
