// Loading placeholder for OrderHistoryList — mirrors the real row shape
// (thumbnail + two text lines + trailing price/badge) so the layout doesn't
// shift when data arrives (CLS). Pulse collapses to static under
// prefers-reduced-motion via motion-safe:.
export default function OrderHistoryListSkeleton({
  rows = 5,
}: {
  rows?: number;
}) {
  return (
    <ul
      aria-hidden="true"
      className="divide-y divide-line border-t border-line motion-safe:animate-pulse"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 py-5">
          <div className="h-14 w-14 shrink-0 rounded-sm bg-fill" />
          <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="h-3 w-24 rounded-sm bg-fill" />
              <div className="h-3 w-36 rounded-sm bg-fill" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-3 w-16 rounded-sm bg-fill" />
              <div className="h-6 w-28 rounded-full bg-fill" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
