import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import MobileMenu from "@/components/mobile-menu";
import LanguageSwitcher from "@/components/language-switcher";
import StickyHeader from "@/components/sticky-header";
import NavIconLink from "@/components/nav-icon-link";
import NavMoreMenu from "@/components/nav-more-menu";
import { dictionaryFor, type Locale } from "@/lib/i18n";
import { withStaticCategories } from "@/lib/static-catalog";

export default async function Navbar({ locale }: { locale: Locale }) {
  const dict = dictionaryFor(locale);
  const [session, dbCategories] = await Promise.all([
    auth(),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  // DB categories + code-only ones (money bouquets, mini bouquets).
  const allCategories = withStaticCategories(dbCategories);
  const user = session?.user;
  // Top bar = home + the first 5 categories. Every other category the
  // store promotes (teddy bears, gift bags, money bouquets, mini bouquets)
  // sits in a compact "more" dropdown so the bar never overflows, at any
  // desktop width. All categories are still in the mobile menu and home grid.
  const MORE_NAV_SLUGS = ["teddy-bears", "gift-bags", "money-bouquets", "mini-bouquets"];
  const navCategories = allCategories.slice(0, 5);
  const moreCategories = allCategories.filter((c, i) => i >= 5 && MORE_NAV_SLUGS.includes(c.slug));
  const catName = (c: { nameAr: string; nameEn: string }) => (locale === "ar" ? c.nameAr : c.nameEn);

  return (
    <StickyHeader>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 xl:max-w-7xl">
        <div className="flex items-center gap-3 lg:hidden">
          <MobileMenu categories={allCategories} user={user ?? null} locale={locale} />
        </div>

        <Link href="/" className="flex shrink-0 items-center transition-transform duration-300 hover:scale-[1.03] lg:me-3">
          <Image
            src="/images/brand/freesia_logo.png"
            alt="فريسيا Freesia"
            width={116}
            height={40}
            className="h-8 w-auto min-[400px]:h-10"
            style={{ width: "auto" }}
            priority
          />
        </Link>

        <nav className="hidden items-center min-w-0 gap-4 whitespace-nowrap text-[13px] font-medium text-ink-700 lg:flex lg:gap-5 lg:text-sm">
          <Link href="/" className="underline-grow transition-colors hover:text-coral-600">
            {dict.nav.home}
          </Link>
          {navCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="underline-grow transition-colors hover:text-coral-600"
            >
              {catName(cat)}
            </Link>
          ))}
          {moreCategories.length > 0 && (
            <NavMoreMenu label={dict.nav.more}>
              {moreCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className="block rounded-md px-3 py-2 transition-colors hover:bg-blush-50 hover:text-coral-600"
                >
                  {catName(cat)}
                </Link>
              ))}
            </NavMoreMenu>
          )}
        </nav>

        <form action="/search" className="hidden lg:block">
          <input
            type="text"
            name="q"
            placeholder={dict.common.searchPlaceholder}
            className="w-24 rounded-full border border-ink-300 px-3 py-1.5 text-sm transition-all duration-300 focus:w-40 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
          />
        </form>

        <div className="flex shrink-0 items-center gap-2 lg:gap-3">
          <LanguageSwitcher locale={locale} />
          <NavIconLink href="/wishlist" label={dict.nav.wishlist} icon="♡" eventName="freesia:wishlist-changed" />
          <NavIconLink href="/cart" label={dict.nav.cart} icon="🛍" eventName="freesia:cart-changed" />
          {user ? (
            <>
              <Link
                href={user.role === "admin" || user.role === "employee" ? "/admin" : "/account"}
                className="btn-press max-[400px]:hidden rounded-full bg-coral-500 px-3 py-1.5 text-sm font-semibold lg:px-4 text-white shadow-sm hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]"
              >
                {user.role === "admin" || user.role === "employee" ? dict.nav.dashboard : dict.nav.account}
              </Link>
              <form
                action={async () => {
                  "use server";
                  const { signOut } = await import("@/auth");
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="text-sm text-ink-500 transition-colors hover:text-coral-600">
                  {dict.nav.logout}
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="btn-press max-[400px]:hidden rounded-full bg-coral-500 px-3 py-1.5 text-sm font-semibold lg:px-4 text-white shadow-sm hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]"
            >
              {dict.nav.login}
            </Link>
          )}
        </div>
      </div>
    </StickyHeader>
  );
}
