/*
  Warnings:

  - Made the column `price_max` on table `products` required. This step will fail if there are existing NULL values in that column.
  - Made the column `price_min` on table `products` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "description" TEXT,
    "description_en" TEXT,
    "category_id" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "discount_price" DECIMAL,
    "price_min" DECIMAL NOT NULL,
    "price_max" DECIMAL NOT NULL,
    "season_price_min" DECIMAL,
    "season_price_max" DECIMAL,
    "badge" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_bestseller" BOOLEAN NOT NULL DEFAULT false,
    "is_new" BOOLEAN NOT NULL DEFAULT false,
    "stock_qty" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_products" ("badge", "category_id", "created_at", "description", "description_en", "discount_price", "id", "is_bestseller", "is_featured", "is_new", "name", "name_en", "price", "price_max", "price_min", "season_price_max", "season_price_min", "slug", "status", "stock_qty") SELECT "badge", "category_id", "created_at", "description", "description_en", "discount_price", "id", "is_bestseller", "is_featured", "is_new", "name", "name_en", "price", "price_max", "price_min", "season_price_max", "season_price_min", "slug", "status", "stock_qty" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE INDEX "products_category_id_idx" ON "products"("category_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
