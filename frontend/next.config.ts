import type { NextConfig } from "next";

// Admin-uploaded product images are served by the backend itself (see
// products.service.ts's uploadsBaseUrl), not the frontend's own origin —
// next/image refuses any remote src whose host isn't explicitly allow-listed.
// Mirrors services/api.ts's handling of NEXT_PUBLIC_API_URL: unset (or
// unparseable) means same-origin, which needs no remotePatterns entry.
function resolveUploadsRemotePattern() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return undefined;
  try {
    const parsed = new URL(apiUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return {
      protocol: parsed.protocol.replace(":", "") as "http" | "https",
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: "/uploads/**",
    };
  } catch {
    return undefined;
  }
}

const uploadsRemotePattern = resolveUploadsRemotePattern();

// Admin-uploaded product images now resolve to Cloudinary CDN URLs (see
// StorageService.resolveUrl) instead of the backend's own /uploads mount.
// Cloud name comes from NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME (must match the
// backend's CLOUDINARY_CLOUD_NAME) rather than being hardcoded, so a
// different Cloudinary account per environment doesn't silently break
// next/image. The cloud name itself isn't a secret — it's embedded in every
// Cloudinary image URL served to shoppers.
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "eb41d6ho";
const cloudinaryRemotePattern = {
  protocol: "https" as const,
  hostname: "res.cloudinary.com",
  pathname: `/${cloudName}/image/upload/**`,
};

const nextConfig: NextConfig = {
  // Same-origin proxy for the API (see CLIENT_API_BASE_URL in lib/config.ts).
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (process.env.NEXT_PUBLIC_USE_API_PROXY !== "true" || !apiUrl) return [];
    return [
      { source: "/api/:path*", destination: `${apiUrl.replace(/\/$/, "")}/api/:path*` },
    ];
  },
  // Emits a self-contained .next/standalone folder (traced deps only, no
  // full node_modules) so the Docker production image can skip `pnpm install`
  // entirely and just run `node server.js`.
  output: process.env.VERCEL ? undefined : "standalone",
  images: {
    // Local placeholder art is shipped as SVG in /public/images. next/image
    // refuses to optimize SVG unless explicitly allowed; these are our own
    // trusted files, served read-only under a strict CSP.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: uploadsRemotePattern
      ? [uploadsRemotePattern, cloudinaryRemotePattern]
      : [cloudinaryRemotePattern],
  },
};

export default nextConfig;
