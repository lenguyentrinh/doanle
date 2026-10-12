export default function AdminEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[18px] border border-dashed border-line-strong bg-fill py-16 text-center">
      <p className="font-display text-[26px] text-ink">{title}</p>
      <p className="mt-2 text-body-sm text-ink-muted">{description}</p>
    </div>
  );
}
