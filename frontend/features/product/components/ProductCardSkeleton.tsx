// Placeholder card shown while a product grid loads data client-side.
// Mirrors the elevated ProductCard: same rounded surface, hairline border,
// resting shadow, and inner text padding. Pulses only when motion is safe.
export default function ProductCardSkeleton() {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-[16px] border border-line bg-surface shadow-card"
      aria-hidden="true"
    >
      <div className="aspect-[3/4] bg-fill motion-safe:animate-pulse" />
      <div className="flex flex-col gap-2 px-4 pb-5 pt-4">
        <div className="h-2.5 w-1/4 rounded-xs bg-fill motion-safe:animate-pulse" />
        <div className="h-3.5 w-2/3 rounded-xs bg-fill motion-safe:animate-pulse" />
        <div className="h-3 w-1/5 rounded-xs bg-fill motion-safe:animate-pulse" />
      </div>
    </div>
  );
}
