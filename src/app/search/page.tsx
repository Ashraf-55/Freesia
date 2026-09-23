import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/product-card";
import StaggerGrid from "@/components/stagger-grid";
import { serializeProducts } from "@/lib/serialize";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { dict } = await getDictionary();
  return { title: dict.searchPage.placeholder };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const { dict } = await getDictionary();

  const productsRaw = query
    ? await prisma.product.findMany({
        where: {
          status: "active",
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
          ],
        },
        include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
        take: 40,
      })
    : [];
  const products = serializeProducts(productsRaw);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <form className="mb-8">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder={dict.searchPage.placeholder}
          className="w-full max-w-md rounded-full border border-ink-300 px-5 py-3 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none"
        />
      </form>

      {query && <p className="animate-fade-in mb-6 text-ink-500">{dict.searchPage.resultsFor(products.length, query)}</p>}

      <StaggerGrid className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {products.map((p, i) => (
          <div key={p.id} className="stagger-item" style={{ transitionDelay: `${(i % 8) * 60}ms` }}>
            <ProductCard product={p} />
          </div>
        ))}
      </StaggerGrid>
    </div>
  );
}
