interface AdminPageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  /** Right-side chip/CTA slot — content differs per screen. */
  children?: React.ReactNode;
}

// eyebrow + h1 + a right-side slot — the header row every admin screen has
// led with since the dashboard redesign (app/admin/page.tsx); pulled out
// here so the other admin screens don't hand-roll the same markup again.
export default function AdminPageHeader({
  eyebrow = 'Quản trị',
  title,
  children,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 motion-safe:animate-[rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className="flex flex-col gap-1.5">
        <span className="text-label-xs text-accent">{eyebrow}</span>
        <h1 className="font-display text-[clamp(30px,3.4vw,46px)] leading-[1.04] tracking-[-0.02em] text-ink">
          {title}
        </h1>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
