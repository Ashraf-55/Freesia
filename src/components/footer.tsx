import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { dictionaryFor, type Locale } from "@/lib/i18n";

export default async function Footer({ locale }: { locale: Locale }) {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" }, take: 6 });
  const dict = dictionaryFor(locale);
  const catName = (c: { nameAr: string; nameEn: string }) => (locale === "ar" ? c.nameAr : c.nameEn);

  return (
    <footer className="mt-16 border-t border-blush-100 bg-blush-50">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-ink-700">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Image
              src="/images/brand/freesia_logo.png"
              alt="فريسيا"
              width={116}
              height={40}
              className="h-10 w-auto"
            />
            <p className="mt-3 text-ink-500">{dict.footer.tagline}</p>
          </div>

          <div>
            <h5 className="mb-2 font-semibold text-ink-900">{dict.footer.shopTitle}</h5>
            <ul className="space-y-1">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/category/${c.slug}`} className="underline-grow inline-block transition-colors hover:text-coral-600">
                    {catName(c)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="mb-2 font-semibold text-ink-900">{dict.footer.aboutTitle}</h5>
            <ul className="space-y-1">
              <li><a href="#" className="underline-grow inline-block transition-colors hover:text-coral-600">{dict.footer.aboutUs}</a></li>
              <li><Link href="/contact" className="underline-grow inline-block transition-colors hover:text-coral-600">{dict.footer.contactUs}</Link></li>
              <li><a href="#" className="underline-grow inline-block transition-colors hover:text-coral-600">{dict.footer.privacy}</a></li>
              <li><a href="#" className="underline-grow inline-block transition-colors hover:text-coral-600">{dict.footer.terms}</a></li>
              <li><Link href="/staff-login" className="underline-grow inline-block transition-colors hover:text-coral-600">{dict.footer.staffLogin}</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="mb-2 font-semibold text-ink-900">{dict.footer.contactTitle}</h5>
            <ul className="space-y-1 text-ink-500">
              <li>{dict.footer.phone}</li>
              <li>{dict.footer.email}</li>
              <li>{dict.footer.address}</li>
            </ul>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-ink-300">
          © {new Date().getFullYear()} {dict.common.siteName}. {dict.footer.rights}
        </p>
      </div>
    </footer>
  );
}
