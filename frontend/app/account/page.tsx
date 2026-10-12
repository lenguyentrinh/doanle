import Image from 'next/image';
import AccountWelcome from '@/features/account/components/AccountWelcome';
import ProfileSection from '@/features/account/components/ProfileSection';
import AddressPreview from '@/features/account/components/AddressPreview';

// Stitch "Account | Profile & Addresses": welcome header, an asymmetric
// 1.2fr / 0.8fr grid (profile section beside an editorial aside), then the
// full-width saved-addresses grid. Auth gating + rail live in layout.tsx.
export default function AccountPage() {
  return (
    <>
      <AccountWelcome />
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
        <ProfileSection />
        {/* Editorial brand aside (spec lines 783-789): full-bleed lifestyle
            photo + gradient + marketing copy, not a fabricated membership/
            rewards card — reuses the same account-editorial asset already
            shipped for SharedSidebar's rail portrait. */}
        <aside className="motion-safe:animate-account-rise relative min-h-[340px] overflow-hidden rounded-[16px] bg-fill shadow-card">
          <Image
            src="/images/account-editorial.png"
            alt=""
            fill
            aria-hidden="true"
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/5 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <span className="text-label-xs text-white/70">Thành viên</span>
            <p className="mt-3 max-w-[24ch] text-headline-md text-white">
              Ưu tiên tiếp cận mọi lô hàng, trước khi mở bán.
            </p>
          </div>
        </aside>
      </div>
      <AddressPreview />
    </>
  );
}
