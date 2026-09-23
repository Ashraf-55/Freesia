import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/product-card";
import HeroSection from "@/components/hero-section";
import StaggerGrid from "@/components/stagger-grid";
import { getImageDimensions } from "@/lib/image-dimensions";
import { serializeProducts } from "@/lib/serialize";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { locale } = await getDictionary();
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return {};

  const name = locale === "ar" ? category.nameAr : category.nameEn;

  return {
    title: name,
    description: category.description ?? undefined,
    openGraph: {
      title: name,
      description: category.description ?? undefined,
      images: category.bannerImage ? [`/images/${category.bannerImage}`] : undefined,
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

  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) notFound();

  const name = locale === "ar" ? category.nameAr : category.nameEn;
  const bannerDimensions = category.bannerImage
    ? getImageDimensions(`images/${category.bannerImage}`)
    : null;

  const orderBy =
    sort === "price_asc"
      ? { price: "asc" as const }
      : sort === "price_desc"
      ? { price: "desc" as const }
      : { createdAt: "desc" as const };

  const productsRaw = await prisma.product.findMany({
    where: { categoryId: category.id, status: "active" },
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
    orderBy,
  });
  const products = serializeProducts(productsRaw);

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
      {category.bannerImage ? (
        <HeroSection
          image={`/images/${category.bannerImage}`}
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
          <StaggerGrid className="grid grid-cols-2 gap-5 md:grid-cols-4">
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
