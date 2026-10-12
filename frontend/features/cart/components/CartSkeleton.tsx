// Loading placeholder for the cart page. Mirrors the editorial layout (hairline
// item rows + hairline-bordered summary panel) so the page keeps its shape
// while data loads, instead of a bare "Loading..." line. Purely presentational.
export default function CartSkeleton() {
  return (
    <div className="bg-paper">
      <section
        role="status"
        aria-label="Đang tải giỏ hàng"
        className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-5 sm:py-16 lg:px-10 lg:py-24"
      >
        <span className="sr-only">Đang tải…</span>
        <div className="mb-10 border-b border-line pb-6 md:mb-14">
          <div className="h-10 w-64 bg-fill motion-safe:animate-pulse" />
          <div className="mt-3 h-4 w-20 bg-fill motion-safe:animate-pulse" />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
          <div className="divide-y divide-line" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 py-7 first:pt-0 sm:gap-7">
                <div className="aspect-[3/4] w-20 shrink-0 rounded-sm bg-fill motion-safe:animate-pulse sm:w-24" />
                <div className="flex flex-col">
                  <div className="h-4 w-2/3 bg-fill motion-safe:animate-pulse" />
                  <div className="mt-3 h-3 w-1/4 bg-fill motion-safe:animate-pulse" />
                  <div className="mt-auto flex items-center justify-between pt-6">
                    <div className="h-9 w-28 bg-fill motion-safe:animate-pulse" />
                    <div className="h-5 w-16 bg-fill motion-safe:animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            className="h-fit rounded-lg border border-line bg-surface p-8 shadow-card"
            aria-hidden="true"
          >
            <div className="h-6 w-1/2 rounded-xs bg-fill motion-safe:animate-pulse" />
            <div className="mt-7 flex flex-col gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-4 w-full rounded-xs bg-fill motion-safe:animate-pulse"
                />
              ))}
            </div>
            <div className="mt-7 h-12 w-full rounded-sm bg-fill motion-safe:animate-pulse" />
          </div>
        </div>
      </section>
    </div>
  );
}
