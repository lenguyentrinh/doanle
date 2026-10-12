import type { Metadata } from "next";
import localFont from "next/font/local";
import LayoutShell from "./LayoutShell";
import Providers from "./providers";
import "./globals.css";

// Self-hosted fonts: the corporate TLS proxy blocks next/font/google's
// download of Google Fonts, so files are bundled in ./fonts.
//
// Fontsource's per-family packages split every weight into latin /
// latin-ext / vietnamese subset files (each with its own unicode-range) —
// next/font/local has no way to attach a unicode-range per src entry, so
// loading only the "latin" subset (as a naive port would) silently drops
// Vietnamese glyphs and reintroduces the exact mixed-face bug Jost had.
// These files are instead the full, non-subset-split TTFs from the
// google/fonts source repo, converted to woff2 — one file per
// weight/style with complete Vietnamese + Latin coverage.
const bvp = localFont({
  src: [
    { path: "./fonts/BeVietnamPro-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/BeVietnamPro-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-bvp",
  display: "swap",
});

// Display voice. Two files so italic is real italic, not a synthetic
// slant — the hero accent word, the pull-quote and the "Cảm ơn, {name}"
// line all rely on it, and faux-italic on a serif looks broken.
const newsreader = localFont({
  src: [
    { path: "./fonts/Newsreader-variable.woff2", style: "normal", weight: "200 800" },
    { path: "./fonts/Newsreader-italic-variable.woff2", style: "italic", weight: "200 800" },
  ],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: 'Oren',
  description: 'Thời trang nữ cao cấp',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${bvp.variable} ${newsreader.variable}`} suppressHydrationWarning>
      <body className="antialiased font-sans" suppressHydrationWarning>
        {/* Paper grain — fixed, above everything, click-through. */}
        <div aria-hidden className="oren-grain" />
        <Providers>
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
