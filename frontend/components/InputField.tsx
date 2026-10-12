import React from 'react';

type Variant = 'default' | 'glass' | 'luxury' | 'editorial';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
  inputId?: string;
  /** Visual treatment. `default`/`glass`/`luxury` share the boxed field;
   *  `editorial` is the hairline underline field. */
  variant?: Variant;
  /** Adornment rendered inside the input box (e.g. a password show/hide toggle). */
  trailing?: React.ReactNode;
  labelClassName?: string;
}

// One field language for the whole store: filled, softly-rounded box (no
// border-led box, a warm fill instead) with a tracked uppercase label above,
// error below. Focus swaps to a terracotta border and lifts to white. The
// `editorial` variant swaps the box for a single underline (used in dense
// settings layouts), recoloured to match. Legacy variant names are kept so
// call sites don't churn, but they all resolve to the same system.
const BOXED = {
  wrapper: 'flex flex-col gap-2',
  label: 'text-label-xs text-ink-secondary',
  input:
    'w-full rounded-[10px] border border-line bg-fill px-4 py-3.5 text-body-md text-ink placeholder:text-ink-muted outline-none transition-all duration-200 focus:border-accent focus:bg-white disabled:cursor-not-allowed disabled:opacity-60',
  error: 'text-body-sm text-error-strong',
};

const STYLES: Record<Variant, { wrapper: string; label: string; input: string; error: string }> = {
  default: BOXED,
  glass: BOXED,
  luxury: BOXED,
  editorial: {
    wrapper: 'flex flex-col gap-2',
    label: 'text-label-xs text-ink-muted',
    input:
      'w-full border-0 border-b border-line-strong bg-transparent py-[10px] text-[17px] leading-[1.4] text-ink placeholder:text-ink-muted outline-none transition-colors duration-200 focus:border-accent',
    error: 'text-body-sm text-error-strong',
  },
};

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  function InputField(
    { label, error, inputId, variant = 'default', trailing, className = '', labelClassName = '', required, ...rest },
    ref,
  ) {
    const id = inputId ?? rest.id;
    const styles = STYLES[variant];
    const trailingGap = trailing ? (variant === 'editorial' ? 'pr-[54px]' : 'pr-12') : '';

    const input = (
      <input
        ref={ref}
        id={id}
        required={required}
        aria-required={required}
        className={`${styles.input} ${trailingGap} ${className}`}
        {...rest}
      />
    );

    return (
      <div className={styles.wrapper}>
        {label && (
          <label htmlFor={id} className={`${styles.label} ${labelClassName}`}>
            {label}
            {required && <span className="text-error-strong"> *</span>}
          </label>
        )}
        {trailing ? (
          <div className="relative">
            {input}
            {trailing}
          </div>
        ) : (
          input
        )}
        {error && (
          <span role="alert" className={`flex items-center gap-[7px] ${styles.error}`}>
            {variant === 'editorial' && (
              <span aria-hidden className="h-[5px] w-[5px] shrink-0 rounded-full bg-error-strong" />
            )}
            {error}
          </span>
        )}
      </div>
    );
  },
);

export default InputField;
