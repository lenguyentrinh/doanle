const STEPS = ['Địa chỉ', 'Vận chuyển', 'Thanh toán', 'Xác nhận'];

interface Props {
  currentStep: number;
}

// 4-step progress rail: numbered pill nodes over a 1px track, with a
// terracotta progress line filling to the current step. Current = accent,
// completed = ink, upcoming = white/line-strong.
export default function CheckoutSteps({ currentStep }: Props) {
  const progress = (currentStep / (STEPS.length - 1)) * 100;

  return (
    <ol className="relative flex items-start justify-between">
      <div className="absolute left-0 right-0 top-3 h-px bg-line" aria-hidden />
      <div
        className="absolute left-0 top-3 h-px bg-accent transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ width: `${progress}%` }}
        aria-hidden
      />
      {STEPS.map((label, i) => {
        const active = i === currentStep;
        const done = i < currentStep;
        return (
          <li key={label} className="relative z-10 flex flex-col items-center gap-2">
            <span
              aria-hidden="true"
              className={`flex h-6 w-6 items-center justify-center rounded-full text-label-xs ${
                active
                  ? 'bg-accent text-white'
                  : done
                    ? 'bg-ink text-white'
                    : 'border border-line-strong bg-white text-ink-muted'
              }`}
            >
              {i + 1}
            </span>
            <span
              aria-current={active ? 'step' : undefined}
              className={`text-label-xs ${active || done ? 'text-ink' : 'text-ink-muted'}`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
