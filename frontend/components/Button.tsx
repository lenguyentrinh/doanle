import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'display';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

// Pill button pair, shared by every call site (including ones that render
// their own <button>/<Link> instead of this component, e.g. AddToCartButton,
// QuickViewButton) — import buttonBase/buttonVariants there rather than
// pasting the class strings again.
export const buttonBase =
  'inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full px-8 py-4 text-label-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none';

export const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-white shadow-btn hover:bg-accent hover:shadow-btn-hover motion-safe:hover:-translate-y-0.5 disabled:hover:bg-ink',
  secondary:
    'border border-line-strong bg-transparent text-ink hover:border-ink hover:bg-fill motion-safe:hover:-translate-y-0.5',
  // Full-width serif pill used for auth submit buttons. Overrides the tracked
  // uppercase label voice of buttonBase (text-label-sm).
  display:
    'w-full min-h-[58px] rounded-full px-8 bg-ink text-white font-display text-[19px] font-medium tracking-[-0.005em] normal-case shadow-btn hover:bg-accent hover:shadow-btn-hover motion-safe:hover:-translate-y-0.5 disabled:hover:bg-ink',
};

// Precombined classNames for call sites that render a plain <button>/<Link>
// instead of this component (e.g. route-level error boundaries).
export const buttonPrimary = `${buttonBase} ${buttonVariants.primary}`;
export const buttonSecondary = `${buttonBase} ${buttonVariants.secondary}`;
export const buttonDisplay = `${buttonBase} ${buttonVariants.display}`;

// Primary is a terracotta-on-hover ink pill; secondary is a hairline outline
// that darkens to ink on hover. Both carry the tracked uppercase label voice.
export default function Button({
  variant = 'primary',
  children,
  className = '',
  disabled = false,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`${buttonBase} ${buttonVariants[variant]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
