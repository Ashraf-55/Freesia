import { prisma } from "@/lib/prisma";
import { getStaticProduct } from "@/lib/static-catalog";

/**
 * Static (code-defined) products are NOT seeded into the database. The cart,
 * orders and stock tables, however, reference `products` by foreign key, so
 * the first time a customer adds a *priced* static product to the cart we
 * create its row from the code catalog if `npm run db:sync-static` has not
 * already done so (a safety net; existing rows are never modified).
 *
 * Returns the DB product id, or null when the product is unknown, has no
 * fixed price (those are ordered via Contact), or its category row is missing.
 */
export async function ensureStaticProductRow(slug: string): Promise<string | null> {
  const sp = getStaticProduct(slug);
  if (!sp || sp.price == null) return null;

  const category = await prisma.category.findUnique({ where: { slug: sp.categorySlug }, select: { id: true } });
  if (!category) return null;

  const existing = await prisma.product.findUnique({ where: { slug: sp.slug }, select: { id: true } });
  // Already in the DB (via `npm run db:sync-static` or an earlier add): leave it
  // exactly as the dashboard has it — never overwrite name / price / stock.
  if (existing) return existing.id;

  const created = await prisma.product.create({
    data: {
      slug: sp.slug,
      name: sp.name,
      nameEn: sp.nameEn,
      price: sp.price,
      startingPrice: sp.startingPrice,
      categoryId: category.id,
      status: "active",
      images: { create: [{ filename: sp.image, sortOrder: 0 }] },
    },
    select: { id: true },
  });
  return created.id;
}
