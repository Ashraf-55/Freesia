import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/product-card";
import ScrollReveal from "@/components/scroll-reveal";
import StaggerGrid from "@/components/stagger-grid";
import { serializeProducts } from "@/lib/serialize";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { locale, dict } = await getDictionary();
  const catName = (c: { nameAr: string; nameEn: string }) => (locale === "ar" ? c.nameAr : c.nameEn);
  const [categories, featuredRaw, bestsellersRaw, newArrivalsRaw, premiumRaw] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({
      where: { status: "active", isFeatured: true },
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.product.findMany({
      where: { status: "active", isBestseller: true },
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.product.findMany({
      where: { status: "active", isNew: true },
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.product.findMany({
      where: { status: "active", category: { slug: "premium-flowers" } },
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const featured = serializeProducts(featuredRaw);
  const bestsellers = serializeProducts(bestsellersRaw);
  const newArrivals = serializeProducts(newArrivalsRaw);
  const premium = serializeProducts(premiumRaw);

  return (
    <div>
      {/* Hero — the source video is portrait (phone footage), so it's shown
          centered at its natural aspect ratio over a blurred, cropped copy
          of itself as the background. This avoids ugly stretching/cropping
          you'd get from a plain object-cover on a portrait clip. */}
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-ink-900 text-white md:min-h-[80vh]">
        <video
          className="animate-fade-in absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden
        >
          <source src="/videos/hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-ink-900/40" />

        <div className="relative z-10 flex flex-col items-center gap-6 px-4 py-10 text-center md:flex-row md:gap-10 md:text-start">
          <video
            className="animate-scale-reveal aspect-[9/16] w-56 rounded-[var(--radius-lg)] object-cover shadow-2xl ring-1 ring-white/20 transition-transform duration-700 hover:scale-[1.02] sm:w-64 md:w-72"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/videos/hero.mp4" type="video/mp4" />
          </video>

          <div className="max-w-md">
            <p className="animate-fade-up mb-3 text-sm font-bold uppercase tracking-[0.2em] text-gold-500" style={{ animationDelay: "450ms" }}>
              {dict.home.heroKicker}
            </p>
            <h1 className="display-heading animate-fade-up text-4xl leading-tight md:text-6xl" style={{ animationDelay: "650ms" }}>
              {dict.home.heroTitle}
            </h1>
            <p className="animate-fade-up mt-5 text-lg text-blush-100/90" style={{ animationDelay: "900ms" }}>
              {dict.home.heroSubtitle}
            </p>
            <div className="animate-fade-up mt-6 flex flex-wrap justify-center gap-3 md:justify-start" style={{ animationDelay: "1150ms" }}>
              <Link
                href="/category/natural-flowers"
                className="btn-press rounded-full bg-coral-500 px-8 py-3 font-semibold shadow-sm transition-shadow duration-500 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]"
              >
                {dict.home.shopNow}
              </Link>
              <Link
                href="/category/natural-flowers"
                className="btn-press rounded-full border border-white px-8 py-3 font-semibold text-white transition-colors duration-500 hover:bg-white/10"
              >
                {dict.home.discoverFlowers}
              </Link>
              <Link
                href="/category/gift-boxes"
                className="btn-press rounded-full border border-white px-8 py-3 font-semibold text-white transition-colors duration-500 hover:bg-white/10"
              >
                {dict.home.discoverGifts}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories — section slides in from the left, cards cascade
          up-and-in once the grid is actually on screen. */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <ScrollReveal direction="left" className="mb-10 text-center">
          <p className="section-eyebrow mb-2 text-xs uppercase">Freesia Edit</p>
          <h2 className="display-heading text-3xl text-ink-900">{dict.home.shopByCategory}</h2>
          <div className="gold-divider mx-auto mt-3" />
          <p className="mt-3 text-sm text-ink-500">{dict.home.shopByCategorySubtitle}</p>
        </ScrollReveal>
        <StaggerGrid className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {categories.map((cat, i) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="luxury-card stagger-item group block overflow-hidden rounded-[var(--radius-lg)] bg-white ring-1 ring-blush-100 shadow-[var(--shadow-soft)]"
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <div className="media-frame relative aspect-square overflow-hidden">
                {cat.bannerImage ? (
                  <Image
                    src={`/images/${cat.bannerImage}`}
                    alt={catName(cat)}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-contain p-6 transition duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl opacity-20">🌸</div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-ink-900/0 transition-colors duration-700 group-hover:bg-ink-900/5" />
              </div>
              <div className="border-t border-blush-100 p-4 text-center transition-colors duration-500 group-hover:bg-blush-50/60">
                <span className="underline-grow font-semibold text-ink-900">{catName(cat)}</span>
                {!cat.bannerImage && <span className="block text-xs font-normal text-ink-400">{dict.common.comingSoon}</span>}
              </div>
            </Link>
          ))}
        </StaggerGrid>
      </section>

      {/* Featured products — section slides in from the right for a
          change of rhythm, cards still cascade upward. */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <ScrollReveal direction="right" className="mb-10 text-center">
            <p className="section-eyebrow mb-2 text-xs uppercase">Curated</p>
            <h2 className="display-heading text-3xl text-ink-900">{dict.home.featured}</h2>
            <div className="gold-divider mx-auto mt-3" />
            <p className="mt-3 text-sm text-ink-500">{dict.home.featuredSubtitle}</p>
          </ScrollReveal>
          <StaggerGrid className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {featured.map((p, i) => (
              <div key={p.id} className="stagger-item" style={{ transitionDelay: `${(i % 8) * 70}ms` }}>
                <ProductCard product={p} />
              </div>
            ))}
          </StaggerGrid>
        </section>
      )}

      {/* Bestsellers — slides in from the left. */}
      {bestsellers.length > 0 && (
        <section className="bg-gradient-to-b from-blush-50 via-blush-50 to-white py-16">
          <div className="mx-auto max-w-6xl px-4">
            <ScrollReveal direction="left" className="mb-10 text-center">
              <p className="section-eyebrow mb-2 text-xs uppercase">Loved by You</p>
              <h2 className="display-heading text-3xl text-ink-900">{dict.home.bestsellers}</h2>
              <div className="gold-divider mx-auto mt-3" />
              <p className="mt-3 text-sm text-ink-500">{dict.home.bestsellersSubtitle}</p>
            </ScrollReveal>
            <StaggerGrid className="grid grid-cols-2 gap-5 md:grid-cols-4">
              {bestsellers.map((p, i) => (
                <div key={p.id} className="stagger-item" style={{ transitionDelay: `${(i % 8) * 70}ms` }}>
                  <ProductCard product={p} />
                </div>
              ))}
            </StaggerGrid>
          </div>
        </section>
      )}

      {/* New arrivals — slides in from the right. */}
      {newArrivals.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <ScrollReveal direction="right" className="mb-10 text-center">
            <p className="section-eyebrow mb-2 text-xs uppercase">Just In</p>
            <h2 className="display-heading text-3xl text-ink-900">{dict.home.newArrivals}</h2>
            <div className="gold-divider mx-auto mt-3" />
            <p className="mt-3 text-sm text-ink-500">{dict.home.newArrivalsSubtitle}</p>
          </ScrollReveal>
          <StaggerGrid className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {newArrivals.map((p, i) => (
              <div key={p.id} className="stagger-item" style={{ transitionDelay: `${(i % 8) * 70}ms` }}>
                <ProductCard product={p} />
              </div>
            ))}
          </StaggerGrid>
        </section>
      )}

      {/* Premium — closes the story with a gentle scale-reveal instead
          of another slide, so the finale reads as a distinct moment. */}
      {premium.length > 0 && (
        <ScrollReveal direction="scale">
          <section className="relative mx-auto my-16 max-w-6xl overflow-hidden rounded-[var(--radius-lg)] bg-ink-900 px-4 py-16 text-white sm:px-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-coral-500/10 blur-3xl" />
            <div className="relative mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-gold-500">Exclusive</p>
                <h2 className="display-heading text-3xl">{dict.home.premium}</h2>
                <p className="mt-2 text-sm text-blush-100/80">{dict.home.premiumSubtitle}</p>
              </div>
              <Link href="/category/premium-flowers" className="underline-grow text-sm font-semibold text-gold-500">
                {dict.common.viewAll} ←
              </Link>
            </div>
            <StaggerGrid className="relative grid grid-cols-2 gap-5 md:grid-cols-4">
              {premium.map((p, i) => (
                <div key={p.id} className="stagger-item" style={{ transitionDelay: `${(i % 8) * 70}ms` }}>
                  <ProductCard product={p} />
                </div>
              ))}
            </StaggerGrid>
          </section>
        </ScrollReveal>
      )}
    </div>
  );
}
