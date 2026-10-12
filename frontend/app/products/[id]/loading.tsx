// Suspense fallback for client-side navigation into a PDP. Mirrors the shipped
// layout (sharp gallery tiles + flat info column) so the transition feels
// stable. Pulses only when motion is safe.
export default function Loading() {
  return (
    <div>
      <section className="mx-auto w-full max-w-[1400px] px-5 py-16 lg:px-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 lg:w-[58%]">
            <div className="aspect-[3/4] rounded-md bg-fill shadow-card motion-safe:animate-pulse md:col-span-2" />
            <div className="aspect-square rounded-md bg-fill shadow-card motion-safe:animate-pulse" />
            <div className="aspect-square rounded-md bg-fill shadow-card motion-safe:animate-pulse" />
          </div>
          <div className="flex w-full flex-col gap-6 lg:w-[42%] lg:pl-2">
            <div className="h-3 w-24 rounded-xs bg-fill motion-safe:animate-pulse" />
            <div className="h-9 w-2/3 rounded-xs bg-fill motion-safe:animate-pulse" />
            <div className="h-5 w-1/3 rounded-xs bg-fill motion-safe:animate-pulse" />
            <div className="mt-2 h-14 w-full rounded-sm bg-fill motion-safe:animate-pulse" />
            <div className="mt-2 flex flex-col gap-3 border-t border-line pt-5">
              <div className="h-4 w-full bg-fill motion-safe:animate-pulse" />
              <div className="h-4 w-full bg-fill motion-safe:animate-pulse" />
              <div className="h-4 w-4/5 bg-fill motion-safe:animate-pulse" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
