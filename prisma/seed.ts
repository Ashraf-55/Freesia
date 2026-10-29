/**
 * Freesia — Seed data
 * --------------------
 * Populates categories + products from a real, hand-verified catalog
 * snapshot (prisma/catalog-snapshot.json + categories-snapshot.json) —
 * NOT randomly generated. This snapshot is the actual, real product
 * names/prices/starting-prices that were live on the store as of
 * 2026-09-30 (compared field-by-field against the client's own
 * screenshots). Deploying to a fresh server and running this seed
 * reproduces the exact same real catalog — not placeholder data.
 *
 * To refresh the snapshot after further edits made through the admin
 * dashboard, re-export it from the live database (see PROGRESS.md for
 * the export query) — don't hand-edit prices/names back into randomness.
 *
 * NON-DESTRUCTIVE (safe to run against a live store, any number of times):
 *   - nothing is ever deleted, wiped or overwritten;
 *   - a category / product is only CREATED when its slug does not exist yet;
 *     anything that already exists (names, prices, stock, images, flags,
 *     products you added or renamed later) is left exactly as it is;
 *   - users, orders, carts, inventory and settings are never touched.
 * On a brand-new empty database it builds the full catalog from the snapshot.
 */
import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { PERMISSIONS } from "../src/lib/permissions";

const prisma = new PrismaClient();

type CategorySnapshot = {
  slug: string;
  name_en: string;
  name_ar: string;
  description: string | null;
  banner_image: string | null;
  sort_order: number;
};

type ProductSnapshot = {
  slug: string;
  name: string;
  name_en: string | null;
  description: string | null;
  description_en: string | null;
  category_slug: string;
  price: number;
  starting_price: number | null;
  badge: string | null;
  is_featured: number;
  is_bestseller: number;
  is_new: number;
  stock_qty: number;
  status: "active" | "draft" | "archived";
  image: string | null;
  /** optional: all photos in order (first = main). Falls back to `image`. */
  images?: string[];
};

function loadSnapshot<T>(file: string): T[] {
  return JSON.parse(fs.readFileSync(path.join(__dirname, file), "utf-8"));
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

  const categories = loadSnapshot<CategorySnapshot>("categories-snapshot.json");
  const products = loadSnapshot<ProductSnapshot>("catalog-snapshot.json");

  // Categories: create only the missing ones, never modify existing ones.
  const catIds: Record<string, string> = {};
  let categoriesCreated = 0;
  for (const c of categories) {
    const existing = await prisma.category.findUnique({ where: { slug: c.slug } });
    if (existing) {
      catIds[c.slug] = existing.id;
      continue;
    }
    const cat = await prisma.category.create({
      data: {
        slug: c.slug,
        nameEn: c.name_en,
        nameAr: c.name_ar,
        description: c.description ?? undefined,
        bannerImage: c.banner_image ?? undefined,
        sortOrder: c.sort_order,
      },
    });
    catIds[c.slug] = cat.id;
    categoriesCreated++;
  }

  // Products: create only the missing ones (matched by slug), never touch existing ones.
  let totalProducts = 0;
  let productsSkipped = 0;
  for (const p of products) {
    const categoryId = catIds[p.category_slug];
    if (!categoryId) {
      console.warn(`Skipping ${p.slug}: category ${p.category_slug} not found`);
      continue;
    }
    if (await prisma.product.findUnique({ where: { slug: p.slug }, select: { id: true } })) {
      productsSkipped++;
      continue;
    }
    const product = await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        nameEn: p.name_en ?? undefined,
        description: p.description ?? undefined,
        descriptionEn: p.description_en ?? undefined,
        categoryId,
        price: p.price,
        startingPrice: p.starting_price ?? undefined,
        badge: p.badge ?? undefined,
        isFeatured: !!p.is_featured,
        isBestseller: !!p.is_bestseller,
        isNew: !!p.is_new,
        stockQty: p.stock_qty,
        status: p.status,
      },
    });
    const photos = p.images?.length ? p.images : p.image ? [p.image] : [];
    for (const [i, filename] of photos.entries()) {
      await prisma.productImage.create({
        data: { productId: product.id, filename, sortOrder: i },
      });
    }
    totalProducts++;
  }

  // ---- demo accounts (dev only) ----
  // These have publicly-known passwords, so they are NEVER created when
  // NODE_ENV=production unless you explicitly opt in with SEED_DEMO_ACCOUNTS=true.
  const allowDemo = process.env.NODE_ENV !== "production" || process.env.SEED_DEMO_ACCOUNTS === "true";
  if (allowDemo) {
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

  } else {
    console.log("Demo accounts skipped (production). Set SEED_DEMO_ACCOUNTS=true to create them.");
  }

  console.log(
    `Seed complete (non-destructive): ${totalProducts} products created, ${productsSkipped} already existed; ` +
      `${categoriesCreated} categories created, ${categories.length - categoriesCreated} already existed.`
  );
  if (allowDemo) {
    console.log("Demo accounts:");
    console.log("  Admin    -> admin@freesia.test / Admin@12345");
    console.log("  Employee -> sara@freesia.test / Employee@123  (limited permissions)");
    console.log("  Customer -> customer@freesia.test / Customer@123");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
