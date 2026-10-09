import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Homepage "Bestsellers" and "Featured" are fully automatic, based on
 * real sales in the last SALES_WINDOW_DAYS days — combining online
 * Orders and in-store POS sales. There is no manual admin toggle for
 * this anymore (see admin/product-form.tsx): a product shows up here
 * purely because it actually sold, nothing is ever pinned by hand.
 *
 *  - Bestsellers: the top BESTSELLER_LIMIT products overall by units
 *    sold in the window.
 *  - Featured: the single best-selling product *per category* in the
 *    window (diversity across the catalog) — a category with zero
 *    sales in the window simply has no featured product, it is not
 *    backfilled with a guess.
 *
 * Cancelled orders and voided POS sales don't count as sales.
 */
const SALES_WINDOW_DAYS = 30;
const BESTSELLER_LIMIT = 8;

const PRODUCT_INCLUDE = {
  images: { take: 1, orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductInclude;

async function getUnitsSoldMap(days: number): Promise<Map<string, number>> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [orderAgg, posAgg] = await Promise.all([
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        productId: { not: null },
        order: { status: { not: "cancelled" }, createdAt: { gte: cutoff } },
      },
      _sum: { qty: true },
    }),
    prisma.posSaleItem.groupBy({
      by: ["productId"],
      where: {
        sale: { status: { not: "voided" }, createdAt: { gte: cutoff } },
      },
      _sum: { qty: true },
    }),
  ]);

  const map = new Map<string, number>();
  for (const row of orderAgg) {
    if (!row.productId) continue;
    map.set(row.productId, (map.get(row.productId) ?? 0) + (row._sum.qty ?? 0));
  }
  for (const row of posAgg) {
    map.set(row.productId, (map.get(row.productId) ?? 0) + (row._sum.qty ?? 0));
  }
  return map;
}

export async function getBestsellingProducts(limit = BESTSELLER_LIMIT) {
  const salesMap = await getUnitsSoldMap(SALES_WINDOW_DAYS);
  const rankedIds = [...salesMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([productId]) => productId);

  if (rankedIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: rankedIds }, status: "active" },
    include: PRODUCT_INCLUDE,
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  // groupBy doesn't preserve sort order — re-apply it here.
  return rankedIds.map((id) => byId.get(id)).filter((p): p is (typeof products)[number] => Boolean(p));
}

export async function getFeaturedProductsByCategory() {
  const salesMap = await getUnitsSoldMap(SALES_WINDOW_DAYS);
  if (salesMap.size === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: [...salesMap.keys()] }, status: "active" },
    include: PRODUCT_INCLUDE,
  });

  const bestPerCategory = new Map<string, { product: (typeof products)[number]; qty: number }>();
  for (const product of products) {
    const qty = salesMap.get(product.id) ?? 0;
    const current = bestPerCategory.get(product.categoryId);
    if (!current || qty > current.qty) {
      bestPerCategory.set(product.categoryId, { product, qty });
    }
  }

  return [...bestPerCategory.values()]
    .sort((a, b) => b.qty - a.qty)
    .map((entry) => entry.product);
}
