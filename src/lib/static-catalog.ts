import type { Category } from "@prisma/client";

/**
 * Static (hardcoded) product catalog — intentionally NOT stored in the
 * database. Add/edit/remove products by editing STATIC_PRODUCTS below;
 * images live in public/images/static-catalog/.
 *
 * price: null  => no fixed price (gift boxes / money bouquets). Such products
 *                 reuse the storefront's existing "price on request" path
 *                 (no number is ever shown, no cart/order is created).
 * Static products are not DB rows, so they have no cart / wishlist / order
 * records: they are ordered through the Contact page.
 */
export type StaticProduct = {
  slug: string;
  categorySlug: string;
  name: string;
  nameEn: string;
  price: number | null;
  startingPrice: number | null;
  /** path relative to /public/images */
  image: string;
};

export const STATIC_PRODUCTS: StaticProduct[] = [
  { slug: "natural-01", categorySlug: "natural-flowers", name: "ورد طبيعي", nameEn: "Natural Flowers", price: 200, startingPrice: null, image: "static-catalog/natural/natural-01.jpg" },
  { slug: "natural-02", categorySlug: "natural-flowers", name: "ورد طبيعي", nameEn: "Natural Flowers", price: 250, startingPrice: null, image: "static-catalog/natural/natural-02.jpg" },
  { slug: "natural-03", categorySlug: "natural-flowers", name: "ورد طبيعي", nameEn: "Natural Flowers", price: 350, startingPrice: null, image: "static-catalog/natural/natural-03.jpg" },
  { slug: "natural-04", categorySlug: "natural-flowers", name: "ورد طبيعي", nameEn: "Natural Flowers", price: 600, startingPrice: null, image: "static-catalog/natural/natural-04.jpg" },
  { slug: "natural-05", categorySlug: "natural-flowers", name: "ورد طبيعي", nameEn: "Natural Flowers", price: 400, startingPrice: null, image: "static-catalog/natural/natural-05.jpg" },
  { slug: "natural-06", categorySlug: "natural-flowers", name: "ورد طبيعي", nameEn: "Natural Flowers", price: 400, startingPrice: null, image: "static-catalog/natural/natural-06.jpg" },
  { slug: "artificial-01", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 350, startingPrice: null, image: "static-catalog/artificial/artificial-01.jpg" },
  { slug: "artificial-02", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 400, startingPrice: null, image: "static-catalog/artificial/artificial-02.jpg" },
  { slug: "artificial-03", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 400, startingPrice: null, image: "static-catalog/artificial/artificial-03.jpg" },
  { slug: "artificial-04", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 400, startingPrice: null, image: "static-catalog/artificial/artificial-04.jpg" },
  { slug: "artificial-05", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 350, startingPrice: null, image: "static-catalog/artificial/artificial-05.jpg" },
  { slug: "artificial-06", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 450, startingPrice: null, image: "static-catalog/artificial/artificial-06.jpg" },
  { slug: "artificial-07", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 400, startingPrice: null, image: "static-catalog/artificial/artificial-07.jpg" },
  { slug: "artificial-08", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 450, startingPrice: null, image: "static-catalog/artificial/artificial-08.jpg" },
  { slug: "artificial-09", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 450, startingPrice: null, image: "static-catalog/artificial/artificial-09.jpg" },
  { slug: "artificial-10", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 400, startingPrice: null, image: "static-catalog/artificial/artificial-10.jpg" },
  { slug: "artificial-11", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 350, startingPrice: null, image: "static-catalog/artificial/artificial-11.jpg" },
  { slug: "artificial-12", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 400, startingPrice: null, image: "static-catalog/artificial/artificial-12.jpg" },
  { slug: "artificial-13", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 450, startingPrice: null, image: "static-catalog/artificial/artificial-13.jpg" },
  { slug: "artificial-14", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 650, startingPrice: null, image: "static-catalog/artificial/artificial-14.jpg" },
  { slug: "artificial-15", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 350, startingPrice: null, image: "static-catalog/artificial/artificial-15.jpg" },
  { slug: "artificial-16", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 250, startingPrice: null, image: "static-catalog/artificial/artificial-16.jpg" },
  { slug: "artificial-17", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 750, startingPrice: null, image: "static-catalog/artificial/artificial-17.jpg" },
  { slug: "artificial-18", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 500, startingPrice: null, image: "static-catalog/artificial/artificial-18.jpg" },
  { slug: "artificial-19", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 350, startingPrice: null, image: "static-catalog/artificial/artificial-19.jpg" },
  { slug: "artificial-20", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 400, startingPrice: null, image: "static-catalog/artificial/artificial-20.jpg" },
  { slug: "artificial-21", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 1300, startingPrice: null, image: "static-catalog/artificial/artificial-21.jpg" },
  { slug: "artificial-22", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 900, startingPrice: null, image: "static-catalog/artificial/artificial-22.jpg" },
  { slug: "artificial-23", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 400, startingPrice: null, image: "static-catalog/artificial/artificial-23.jpg" },
  { slug: "artificial-24", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 1100, startingPrice: null, image: "static-catalog/artificial/artificial-24.jpg" },
  { slug: "artificial-25", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 1300, startingPrice: null, image: "static-catalog/artificial/artificial-25.jpg" },
  { slug: "artificial-26", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 1050, startingPrice: null, image: "static-catalog/artificial/artificial-26.jpg" },
  { slug: "artificial-27", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 1700, startingPrice: null, image: "static-catalog/artificial/artificial-27.jpg" },
  { slug: "artificial-28", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 1200, startingPrice: null, image: "static-catalog/artificial/artificial-28.jpg" },
  { slug: "artificial-29", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 1400, startingPrice: null, image: "static-catalog/artificial/artificial-29.jpg" },
  { slug: "artificial-30", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 1500, startingPrice: null, image: "static-catalog/artificial/artificial-30.jpg" },
  { slug: "artificial-31", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 1400, startingPrice: null, image: "static-catalog/artificial/artificial-31.jpg" },
  { slug: "artificial-32", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 1300, startingPrice: null, image: "static-catalog/artificial/artificial-32.jpg" },
  { slug: "artificial-33", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 900, startingPrice: null, image: "static-catalog/artificial/artificial-33.jpg" },
  { slug: "artificial-34", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 1400, startingPrice: null, image: "static-catalog/artificial/artificial-34.jpg" },
  { slug: "artificial-35", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 600, startingPrice: null, image: "static-catalog/artificial/artificial-35.jpg" },
  { slug: "artificial-36", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 1400, startingPrice: null, image: "static-catalog/artificial/artificial-36.jpg" },
  { slug: "artificial-37", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 1000, startingPrice: null, image: "static-catalog/artificial/artificial-37.jpg" },
  { slug: "artificial-38", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 1550, startingPrice: null, image: "static-catalog/artificial/artificial-38.jpg" },
  { slug: "artificial-39", categorySlug: "artificial-flowers", name: "ورد صناعي", nameEn: "Artificial Flowers", price: 1100, startingPrice: 850, image: "static-catalog/artificial/artificial-39.jpg" },
  { slug: "mini-01", categorySlug: "mini-bouquets", name: "ميني بوكيه", nameEn: "Mini Bouquet", price: 150, startingPrice: null, image: "static-catalog/mini/mini-01.jpg" },
  { slug: "mini-02", categorySlug: "mini-bouquets", name: "ميني بوكيه", nameEn: "Mini Bouquet", price: 150, startingPrice: null, image: "static-catalog/mini/mini-02.jpg" },
  { slug: "bag-01", categorySlug: "gift-bags", name: "شنطة هدايا وسط", nameEn: "Medium Gift Bag", price: 45, startingPrice: null, image: "static-catalog/bags/bag-01.jpg" },
  { slug: "bag-02", categorySlug: "gift-bags", name: "شنطة هدايا", nameEn: "Gift Bag", price: 35, startingPrice: null, image: "static-catalog/bags/bag-02.jpg" },
  { slug: "bag-03", categorySlug: "gift-bags", name: "شنطة هدايا", nameEn: "Gift Bag", price: 100, startingPrice: null, image: "static-catalog/bags/bag-03.jpg" },
  { slug: "bag-04", categorySlug: "gift-bags", name: "شنطة هدايا", nameEn: "Gift Bag", price: 40, startingPrice: null, image: "static-catalog/bags/bag-04.jpg" },
  { slug: "bag-05", categorySlug: "gift-bags", name: "شنطة هدايا", nameEn: "Gift Bag", price: 80, startingPrice: null, image: "static-catalog/bags/bag-05.jpg" },
  { slug: "bag-06", categorySlug: "gift-bags", name: "شنطة هدايا", nameEn: "Gift Bag", price: 120, startingPrice: null, image: "static-catalog/bags/bag-06.jpg" },
  { slug: "bag-07", categorySlug: "gift-bags", name: "شنطة هدايا", nameEn: "Gift Bag", price: 120, startingPrice: null, image: "static-catalog/bags/bag-07.jpg" },
  { slug: "bag-08", categorySlug: "gift-bags", name: "شنطة هدايا", nameEn: "Gift Bag", price: 120, startingPrice: null, image: "static-catalog/bags/bag-08.jpg" },
  { slug: "box-01", categorySlug: "gift-boxes", name: "بوكس هدايا حسب المحتوى 1", nameEn: "Gift Box (by contents) 1", price: null, startingPrice: null, image: "static-catalog/boxes/box-01.jpg" },
  { slug: "box-02", categorySlug: "gift-boxes", name: "بوكس هدايا حسب المحتوى 2", nameEn: "Gift Box (by contents) 2", price: null, startingPrice: null, image: "static-catalog/boxes/box-02.jpg" },
  { slug: "box-03", categorySlug: "gift-boxes", name: "بوكس هدايا حسب المحتوى 3", nameEn: "Gift Box (by contents) 3", price: null, startingPrice: null, image: "static-catalog/boxes/box-03.jpg" },
  { slug: "box-04", categorySlug: "gift-boxes", name: "بوكس هدايا حسب المحتوى 4", nameEn: "Gift Box (by contents) 4", price: null, startingPrice: null, image: "static-catalog/boxes/box-04.jpg" },
  { slug: "box-05", categorySlug: "gift-boxes", name: "بوكس هدايا حسب المحتوى 5", nameEn: "Gift Box (by contents) 5", price: null, startingPrice: null, image: "static-catalog/boxes/box-05.jpg" },
  { slug: "box-06", categorySlug: "gift-boxes", name: "بوكس هدايا حسب المحتوى 6", nameEn: "Gift Box (by contents) 6", price: null, startingPrice: null, image: "static-catalog/boxes/box-06.jpg" },
  { slug: "money-01", categorySlug: "money-bouquets", name: "بوكيه فلوس حسب المحتوى 1", nameEn: "Money Bouquet (by contents) 1", price: null, startingPrice: null, image: "static-catalog/money/money-01.jpg" },
  { slug: "money-02", categorySlug: "money-bouquets", name: "بوكيه فلوس حسب المحتوى 2", nameEn: "Money Bouquet (by contents) 2", price: null, startingPrice: null, image: "static-catalog/money/money-02.jpg" },
  { slug: "money-03", categorySlug: "money-bouquets", name: "بوكيه فلوس حسب المحتوى 3", nameEn: "Money Bouquet (by contents) 3", price: null, startingPrice: null, image: "static-catalog/money/money-03.jpg" },
  { slug: "money-04", categorySlug: "money-bouquets", name: "بوكيه فلوس حسب المحتوى 4", nameEn: "Money Bouquet (by contents) 4", price: null, startingPrice: null, image: "static-catalog/money/money-04.jpg" },
  { slug: "money-05", categorySlug: "money-bouquets", name: "بوكيه فلوس حسب المحتوى 5", nameEn: "Money Bouquet (by contents) 5", price: null, startingPrice: null, image: "static-catalog/money/money-05.jpg" },
  { slug: "money-06", categorySlug: "money-bouquets", name: "بوكيه فلوس حسب المحتوى 6", nameEn: "Money Bouquet (by contents) 6", price: null, startingPrice: null, image: "static-catalog/money/money-06.jpg" },
  { slug: "money-07", categorySlug: "money-bouquets", name: "بوكيه فلوس حسب المحتوى 7", nameEn: "Money Bouquet (by contents) 7", price: null, startingPrice: null, image: "static-catalog/money/money-07.jpg" },
  { slug: "money-08", categorySlug: "money-bouquets", name: "بوكيه فلوس حسب المحتوى 8", nameEn: "Money Bouquet (by contents) 8", price: null, startingPrice: null, image: "static-catalog/money/money-08.jpg" },
  { slug: "money-09", categorySlug: "money-bouquets", name: "بوكيه فلوس حسب المحتوى 9", nameEn: "Money Bouquet (by contents) 9", price: null, startingPrice: null, image: "static-catalog/money/money-09.jpg" },
];

/** Categories that exist only in code (not in the DB). */
export const STATIC_CATEGORIES: Category[] = [
  {
    id: "static-money-bouquets",
    slug: "money-bouquets",
    nameAr: "بوكيهات فلوس",
    nameEn: "Money Bouquets",
    description: null,
    bannerImage: "static-catalog/money/money-01.jpg",
    bannerObjectPosition: null,
    sortOrder: 11,
  },
  {
    id: "static-mini-bouquets",
    slug: "mini-bouquets",
    nameAr: "ميني بوكيه",
    nameEn: "Mini Bouquets",
    description: null,
    bannerImage: "static-catalog/mini/mini-01.jpg",
    bannerObjectPosition: null,
    sortOrder: 12,
  },
];

/** Hero/banner photo for DB categories that have no bannerImage of their own. */
const STATIC_BANNERS: Record<string, string> = {
  "gift-bags": "static-catalog/bags/bag-03.jpg",
};
export function getStaticBanner(slug: string): string | null {
  return STATIC_BANNERS[slug] ?? null;
}

export const STATIC_ONLY_CATEGORY_SLUGS = STATIC_CATEGORIES.map((c) => c.slug);

/** DB categories + code-only categories (never duplicates a slug). */
export function withStaticCategories<T extends { slug: string }>(dbCategories: T[]): (T | Category)[] {
  const have = new Set(dbCategories.map((c) => c.slug));
  return [...dbCategories, ...STATIC_CATEGORIES.filter((c) => !have.has(c.slug))];
}

export type StaticCardProduct = {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  price: number;
  startingPrice: number | null;
  badge: null;
  images: { filename: string }[];
  isStatic: true;
};

/** Shape consumed by ProductCard. price 0 = "price on request" (existing convention). */
export function toCardProduct(p: StaticProduct): StaticCardProduct {
  return {
    id: `static:${p.slug}`,
    slug: p.slug,
    name: p.name,
    nameEn: p.nameEn,
    price: p.price ?? 0,
    startingPrice: p.startingPrice,
    badge: null,
    images: [{ filename: p.image }],
    isStatic: true,
  };
}

export function getStaticProduct(slug: string): StaticProduct | undefined {
  return STATIC_PRODUCTS.find((p) => p.slug === slug);
}

export function getStaticProductsByCategory(categorySlug: string): StaticProduct[] {
  return STATIC_PRODUCTS.filter((p) => p.categorySlug === categorySlug);
}

export function getStaticCategory(slug: string): Category | undefined {
  return STATIC_CATEGORIES.find((c) => c.slug === slug);
}

export function searchStaticProducts(query: string): StaticProduct[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return STATIC_PRODUCTS.filter((p) => p.name.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q));
}
