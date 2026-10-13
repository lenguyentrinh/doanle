import Image from "next/image";
import { getAuthLookbook } from "@/features/auth/services/authLookbookApi";
import {
  DEFAULT_LOOKBOOK_CAPTION,
  DEFAULT_LOOKBOOK_LABEL,
  type AuthLookbook,
} from "@/features/auth/types/authLookbook";

// Left arch frame + caption row of AuthShell (md+). Server Component: fetches
// the admin-managed lookbook (ISR, 60s). A failed fetch or unset image falls
// back to the flat placeholder and the original texts — it must never break
// the auth pages.
export default async function AuthLookbookFrame() {
  const lookbook: AuthLookbook = await getAuthLookbook().catch(() => ({
    imageUrl: null,
    caption: null,
    label: null,
  }));

  return (
    <>
      <div className="relative h-[clamp(320px,calc(100vh-260px),600px)]">
        <span aria-hidden className="absolute -right-[8%] -top-6 aspect-square w-1/2 rounded-full bg-sand" />
        <div className="absolute inset-0 overflow-hidden rounded-b-[12px] rounded-t-full bg-fill-dark">
          {lookbook.imageUrl && (
            <Image
              fill
              sizes="440px"
              className="object-cover"
              src={lookbook.imageUrl}
              alt=""
              // Absolute (CDN/backend) URLs skip the optimizer so an un-allow-listed
              // host can never crash the page; same approach as HeroImage.
              unoptimized={/^https?:\/\//i.test(lookbook.imageUrl)}
            />
          )}
        </div>
      </div>
      <div className="mt-3.5 flex justify-between text-[11px] text-ink-muted">
        <span className="font-display text-[14px] italic">{lookbook.caption ?? DEFAULT_LOOKBOOK_CAPTION}</span>
        <span className="tracking-[0.2em]">{lookbook.label ?? DEFAULT_LOOKBOOK_LABEL}</span>
      </div>
    </>
  );
}
