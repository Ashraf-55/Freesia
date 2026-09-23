import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { ToastProvider } from "@/components/toast-provider";
import { getLocale, dirFor } from "@/lib/i18n";

// Self-hosted Cairo (variable font) — bundled locally so the site never
// depends on reaching fonts.googleapis.com (fails behind restricted
// networks/proxies and was breaking the design). Used for both languages;
// Cairo ships a solid Latin charset so EN stays visually consistent.
const cairo = localFont({
  src: "../fonts/Cairo-Variable.woff2",
  variable: "--font-cairo",
  weight: "200 1000",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "فريسيا | Freesia — Luxury Flowers & Gifts",
    template: "%s | فريسيا Freesia",
  },
  description: "متجر فريسيا لتنسيق الورد والهدايا الفاخرة — طلبك يوصلك طازج وأنيق.",
  openGraph: {
    siteName: "Freesia | فريسيا",
    type: "website",
    images: ["/images/brand/freesia_logo.png"],
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    // src/app/icon.png, apple-icon.png and favicon.ico (the Freesia
    // flower-pot mark cropped from the real logo) are auto-detected by
    // the App Router from their file names — this is just an explicit,
    // belt-and-suspenders declaration so every crawler/browser picks the
    // right one instead of falling back to a generic icon.
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const dir = dirFor(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${cairo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-white text-neutral-900" suppressHydrationWarning>
        {/* If JS fails to load, the JS-driven scroll/stagger reveal
            components never flip visible — this keeps the storefront
            and its product grids fully visible and usable regardless. */}
        <noscript>
          <style>{`.reveal-on-scroll, .stagger-item { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
        <ToastProvider>
          <Navbar locale={locale} />
          <main className="flex-1">{children}</main>
          <Footer locale={locale} />
        </ToastProvider>
      </body>
    </html>
  );
}
