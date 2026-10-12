import ProductCardSkeleton from '@/features/product/components/ProductCardSkeleton';

// Suspense fallback for client-side navigation into the /products PLP.
// Mirrors the real layout: hairline-grouped filter rail, hairline results
// header, and the flat 2/3/4 product grid.
export default function Loading() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-5 py-12 lg:px-10 lg:py-16">
      <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-12">
        <div
          className="hidden w-72 flex-shrink-0 rounded-lg border border-line bg-surface p-6 shadow-card md:block"
          aria-hidden="true"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-b border-line py-6 first:pt-0 last:border-b-0">
              <div className="h-2.5 w-20 rounded-xs bg-fill motion-safe:animate-pulse" />
              <div className="mt-4 h-3 w-36 rounded-xs bg-fill motion-safe:animate-pulse" />
              <div className="mt-3 h-3 w-28 rounded-xs bg-fill motion-safe:animate-pulse" />
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-10 flex items-end justify-between border-b border-line pb-6">
            <div className="h-10 w-56 bg-fill motion-safe:animate-pulse" />
            <div className="h-3 w-32 bg-fill motion-safe:animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
