import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/product-card";
import HeroSection from "@/components/hero-section";
import StaggerGrid from "@/components/stagger-grid";
import { getImageDimensions } from "@/lib/image-dimensions";
import { serializeProducts } from "@/lib/serialize";
import { getDictionary } from "@/lib/i18n";
import { getStaticBanner, getStaticCategory, getStaticProductsByCategory, toCardProduct } from "@/lib/static-catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { locale } = await getDictionary();
  const category = (await prisma.category.findUnique({ where: { slug } })) ?? getStaticCategory(slug);
  if (!category) return {};

  const name = locale === "ar" ? category.nameAr : category.nameEn;

  return {
    title: name,
    description: category.description ?? undefined,
    openGraph: {
      title: name,
      description: category.description ?? undefined,
      images: category.bannerImage ?? getStaticBanner(slug) ? [`/images/${category.bannerImage ?? getStaticBanner(slug)}`] : undefined,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { slug } = await params;
  const { sort } = await searchParams;
  const { locale, dict } = await getDictionary();

  const dbCategory = await prisma.category.findUnique({ where: { slug } });
  const category = dbCategory ?? getStaticCategory(slug);
  if (!category) notFound();

  const name = locale === "ar" ? category.nameAr : category.nameEn;
  const bannerImage = category.bannerImage ?? getStaticBanner(slug);
  const bannerDimensions = bannerImage
    ? getImageDimensions(`images/${bannerImage}`)
    : null;

  const orderBy =
    sort === "price_asc"
      ? { price: "asc" as const }
      : sort === "price_desc"
      ? { price: "desc" as const }
      : { createdAt: "desc" as const };

  const productsRaw = dbCategory
    ? await prisma.product.findMany({
        where: { categoryId: dbCategory.id, status: "active" },
        include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
        orderBy,
      })
    : [];
  const dbProducts = serializeProducts(productsRaw);
  // Code-defined (static) products for this category are appended after the
  // DB ones; for price sorting they are merged in (no-price ones go last).
  // Once a static product has been added to a cart it also has a DB reference row — never list it twice.
  const staticSlugsInCategory = getStaticProductsByCategory(slug).map((p) => p.slug);
  const dbSlugs = new Set(
    (await prisma.product.findMany({ where: { slug: { in: staticSlugsInCategory } }, select: { slug: true } })).map((p) => p.slug)
  );
  const staticProducts = getStaticProductsByCategory(slug).filter((p) => !dbSlugs.has(p.slug)).map(toCardProduct);
  const products: ((typeof dbProducts)[number] | (typeof staticProducts)[number])[] = [...dbProducts, ...staticProducts];
  if (sort === "price_asc" || sort === "price_desc") {
    const dir = sort === "price_asc" ? 1 : -1;
    products.sort((a, b) => {
      if (a.price <= 0 && b.price <= 0) return 0;
      if (a.price <= 0) return 1;
      if (b.price <= 0) return -1;
      return (a.price - b.price) * dir;
    });
  }

  const sortOptions = [
    { value: "", label: dict.categoryPage.sortNewest },
    { value: "price_asc", label: dict.categoryPage.sortPriceAsc },
    { value: "price_desc", label: dict.categoryPage.sortPriceDesc },
  ];

  return (
    <div>
      {/* Full-width category hero — never trapped inside the narrow
          max-w-6xl content container (see design system rule: any hero /
          banner image must span the true viewport width). */}
      {bannerImage ? (
        <HeroSection
          image={`/images/${bannerImage}`}
          alt={name}
          eyebrow="Freesia"
          title={name}
          subtitle={category.description}
          naturalWidth={bannerDimensions?.width ?? 1600}
          naturalHeight={bannerDimensions?.height ?? 600}
        />
      ) : (
        <div className="mx-auto max-w-6xl px-4 pt-16 text-center">
          <h1 className="display-heading text-3xl text-ink-900 md:text-4xl">{name}</h1>
          <div className="gold-divider mx-auto mt-3" />
          {category.description && <p className="mt-3 text-ink-700">{category.description}</p>}
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 flex justify-end">
          <div className="inline-flex gap-1 rounded-full bg-blush-50 p-1 text-sm">
            {sortOptions.map((opt) => (
              <a
                key={opt.value}
                href={opt.value ? `?sort=${opt.value}` : "?"}
                className={`rounded-full px-4 py-1.5 font-medium transition ${
                  (sort ?? "") === opt.value ? "bg-coral-500 text-white shadow" : "text-ink-700 hover:text-coral-600"
                }`}
              >
                {opt.label}
              </a>
            ))}
          </div>
        </div>

        {products.length === 0 ? (
          <p className="py-16 text-center text-ink-500">{dict.categoryPage.empty}</p>
        ) : (
          <StaggerGrid className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
            {products.map((p, i) => (
              <div key={p.id} className="stagger-item" style={{ transitionDelay: `${(i % 8) * 70}ms` }}>
                <ProductCard product={p} />
              </div>
            ))}
          </StaggerGrid>
        )}
      </div>
    </div>
  );
}
