import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import MobileMenu from "@/components/mobile-menu";
import LanguageSwitcher from "@/components/language-switcher";
import StickyHeader from "@/components/sticky-header";
import NavIconLink from "@/components/nav-icon-link";
import { dictionaryFor, type Locale } from "@/lib/i18n";

export default async function Navbar({ locale }: { locale: Locale }) {
  const dict = dictionaryFor(locale);
  const [session, allCategories] = await Promise.all([
    auth(),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const user = session?.user;
  const navCategories = allCategories.slice(0, 5);
  const catName = (c: { nameAr: string; nameEn: string }) => (locale === "ar" ? c.nameAr : c.nameEn);

  return (
    <StickyHeader>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3 md:hidden">
          <MobileMenu categories={allCategories} user={user ?? null} locale={locale} />
        </div>

        <Link href="/" className="flex items-center transition-transform duration-300 hover:scale-[1.03]">
          <Image
            src="/images/brand/freesia_logo.png"
            alt="فريسيا Freesia"
            width={116}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-700 md:flex">
          <Link href="/" className="underline-grow transition-colors hover:text-coral-600">
            {dict.nav.home}
          </Link>
          {navCategories.map((cat) => (
            <Link key={cat.id} href={`/category/${cat.slug}`} className="underline-grow transition-colors hover:text-coral-600">
              {catName(cat)}
            </Link>
          ))}
        </nav>

        <form action="/search" className="hidden md:block">
          <input
            type="text"
            name="q"
            placeholder={dict.common.searchPlaceholder}
            className="w-40 rounded-full border border-ink-300 px-3 py-1.5 text-sm transition-all duration-300 focus:w-52 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-3">
          <LanguageSwitcher locale={locale} />
          <NavIconLink href="/wishlist" label={dict.nav.wishlist} icon="♡" eventName="freesia:wishlist-changed" />
          <NavIconLink href="/cart" label={dict.nav.cart} icon="🛍" eventName="freesia:cart-changed" />
          {user ? (
            <>
              <Link
                href={user.role === "admin" || user.role === "employee" ? "/admin" : "/account"}
                className="btn-press rounded-full bg-coral-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]"
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
              className="btn-press rounded-full bg-coral-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]"
            >
              {dict.nav.login}
            </Link>
          )}
        </div>
      </div>
    </StickyHeader>
  );
}
