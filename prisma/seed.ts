/**
 * Freesia — Seed data
 * --------------------
 * Populates categories + products from the real photos supplied by the
 * client (public/images/<category>/) and creates the initial
 * admin / employee / customer demo accounts.
 * Mirrors the original seed.py logic 1:1. Safe to re-run.
 */
import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { PERMISSIONS } from "../src/lib/permissions";

const prisma = new PrismaClient();

// Deterministic PRNG (seed=42 equivalent) so re-runs are stable.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const randInt = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const choice = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

const CATEGORIES: Array<[string, string, string, string]> = [
  ["natural-flowers", "Natural Flowers", "ورد طبيعي", "بوكيهات ورد طبيعي طازج مُنسّقة يدويًا لكل مناسبة."],
  ["artificial-flowers", "Artificial Flowers", "ورد صناعي", "تشكيلة ورد صناعي فاخر يدوم للأبد بلمسة أنيقة."],
  ["premium-flowers", "Premium Flowers", "ورد ترقية / فاخر", "تشكيلة مميزة من البوكيهات الكبيرة والفاخرة للمناسبات الخاصة."],
  ["gift-boxes", "Gift Boxes", "بوكسات هدايا", "بوكسات هدايا فاخرة تجمع الورد مع الشوكولاتة أو هدايا مميزة."],
  ["mugs", "Mugs", "مجات", "مجات سيراميك مميزة بتصميمات وألوان مختلفة."],
  ["teddy-bears", "Teddy Bears", "دِباديب", "دباديب وشخصيات محشوة ضمن تنسيقات هدايا فاخرة."],
  ["accessories", "Accessories", "إكسسوارات", "ساعات وإكسسوارات فاخرة تُقدَّم في عبوة أنيقة."],
  ["engagement-trays", "Engagement Trays", "صواني الخطوبة", "صواني شبكة وخطوبة فاخرة لتنسيقات الأفراح والخطوبة."],
];

const NAME_POOL: Record<string, string[]> = {
  "natural-flowers": [
    "بوكيه ورد أحمر كلاسيك", "بوكيه ورد مختلط فاخر", "بوكيه الزنبق الأبيض",
    "بوكيه الورد والأقحوان", "بوكيه ورد وردي رومانسي", "بوكيه ورد بري",
    "بوكيه ورد أحمر وأبيض", "بوكيه الجوري الملكي", "بوكيه ورد بلون العسل",
    "بوكيه ورد صباحي", "بوكيه ورد المناسبات", "بوكيه الورد الكلاسيكي",
  ],
  "artificial-flowers": [
    "بوكيه زفاف حريري أبيض", "بوكيه الزنبق الصناعي", "بوكيه ورد صناعي فاخر",
    "بوكيه عروس أنيق", "بوكيه ورد صناعي دائم", "بوكيه الياسمين الصناعي",
  ],
  "premium-flowers": [
    "بوكيه ترقية 51 وردة", "بوكيه ترقية ملكي", "بوكيه ترقية دائري فاخر",
    "بوكيه ترقية 100 وردة", "بوكيه ترقية بريميوم أحمر", "بوكيه ترقية ذهبي",
  ],
  "gift-boxes": [
    "بوكس هدية ورد وشوكولاتة", "بوكس هدية فاخر", "بوكيه فلوس مناسبات",
    "بوكس Everyday Love You", "بوكيه ورد وشوكولاتة غالكسي", "بوكس هدية VIP",
  ],
  "teddy-bears": ["بوكس دبدوب وورد", "بوكس هدية شخصيات محشوة"],
  "engagement-trays": ["صينية خطوبة مرايا فاخرة", "صينية شبكة ذهبية", "صينية عقبال عندكم"],
  mugs: [
    "مج سيراميك ورد", "مج بتصميم كيوت", "مج بمقبض ملوّن",
    "مج هدية بمناسبة", "مج بغطاء وشكل مميز", "مج ورد وقلوب",
  ],
  accessories: ["ساعة فاخرة رجالي", "ساعة فاخرة حريمي", "ساعة كلاسيك بعلبة أنيقة"],
};

function pickName(slug: string, idx: number) {
  const pool = NAME_POOL[slug] ?? ["منتج فريسيا"];
  return `${pool[idx % pool.length]} #${idx + 1}`;
}

const PRICE_RANGES: Record<string, [number, number]> = {
  "natural-flowers": [250, 650],
  "artificial-flowers": [350, 800],
  "premium-flowers": [900, 2400],
  "gift-boxes": [400, 1100],
  "teddy-bears": [450, 950],
  "engagement-trays": [700, 1800],
  mugs: [120, 300],
  accessories: [150, 500],
};

type ManifestItem = { src: string; category: string; file: string };

function buildCatalog(): Record<string, string[]> {
  const manifestPath = path.join(__dirname, "image_manifest.json");
  const manifest: ManifestItem[] = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const byCat: Record<string, string[]> = {};
  for (const item of manifest) {
    (byCat[item.category] ??= []).push(item.file);
  }
  return byCat;
}

async function ensureUser(
  name: string,
  email: string,
  password: string,
  role: Role,
  phone?: string
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing.id;
  const passwordHash = await bcrypt.hash(password, 10);
  const created = await prisma.user.create({
    data: { name, email, passwordHash, role, phone },
  });
  return created.id;
}

async function main() {
  // ---- permissions catalog ----
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { labelEn: p.labelEn, labelAr: p.labelAr, module: p.module },
      create: { code: p.code, labelEn: p.labelEn, labelAr: p.labelAr, module: p.module },
    });
  }

  // ---- wipe catalog-only tables (keep users/orders if re-run) ----
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.offer.deleteMany();

  const catIds: Record<string, string> = {};
  for (let i = 0; i < CATEGORIES.length; i++) {
    const [slug, nameEn, nameAr, description] = CATEGORIES[i];
    const cat = await prisma.category.create({
      data: { slug, nameEn, nameAr, description, sortOrder: i },
    });
    catIds[slug] = cat.id;
  }

  const byCat = buildCatalog();

  // set category banner = first image of that category (when available)
  for (const [slug, files] of Object.entries(byCat)) {
    if (files.length && catIds[slug]) {
      await prisma.category.update({
        where: { slug },
        data: { bannerImage: `${slug}/${files[0]}` },
      });
    }
  }

  const badgesCycle: (string | null)[] = [null, "New", "Best Seller", null, "Sale", null];
  let totalProducts = 0;

  for (const [slug, files] of Object.entries(byCat)) {
    if (!catIds[slug]) continue;
    const [lo, hi] = PRICE_RANGES[slug] ?? [200, 600];
    for (let idx = 0; idx < files.length; idx++) {
      const fname = files[idx];
      const name = pickName(slug, idx);
      const price = Math.round((lo + rand() * (hi - lo)) / 5) * 5;
      const badge = badgesCycle[idx % badgesCycle.length];
      const discountPrice = badge === "Sale" ? Math.round((price * 0.85) / 5) * 5 : null;
      const isFeatured = idx % 6 === 0;
      const isBestseller = badge === "Best Seller";
      const isNew = badge === "New";
      const productSlug = `${slug}-${idx + 1}`;

      const product = await prisma.product.create({
        data: {
          slug: productSlug,
          name,
          description: "تنسيق فاخر من فريسيا — يُحضّر طازجًا لحظة الطلب مع تغليف أنيق.",
          categoryId: catIds[slug],
          price,
          discountPrice: discountPrice ?? undefined,
          badge: badge ?? undefined,
          isFeatured,
          isBestseller,
          isNew,
          stockQty: choice([4, 6, 8, 12, 15, 20]),
          status: "active",
        },
      });

      await prisma.productImage.create({
        data: { productId: product.id, filename: `${slug}/${fname}`, sortOrder: 0 },
      });

      totalProducts++;
    }
  }

  // ---- demo accounts (only if not present) ----
  const adminId = await ensureUser("Freesia Admin", "admin@freesia.test", "Admin@12345", "admin", "01000000000");
  const empId = await ensureUser("Sara — Sales Employee", "sara@freesia.test", "Employee@123", "employee", "01000000001");
  await ensureUser("Test Customer", "customer@freesia.test", "Customer@123", "customer", "01000000002");
  void adminId;

  // Grant the demo employee a realistic partial set of permissions
  const demoPerms = ["products.view", "orders.view", "orders.update", "customers.view", "inventory.view"] as const;
  for (const code of demoPerms) {
    await prisma.employeePermission.upsert({
      where: { userId_permissionCode: { userId: empId, permissionCode: code } },
      update: {},
      create: { userId: empId, permissionCode: code },
    });
  }

  console.log(`Seed complete: ${totalProducts} products across ${CATEGORIES.length} categories.`);
  console.log("Demo accounts:");
  console.log("  Admin    -> admin@freesia.test / Admin@12345");
  console.log("  Employee -> sara@freesia.test / Employee@123  (limited permissions)");
  console.log("  Customer -> customer@freesia.test / Customer@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
