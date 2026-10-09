-- Spec 2026-09-30: remove the discount-price / today-price-range /
-- season-price system entirely. Every product goes back to one fixed
-- price. Add a single new optional field, `starting_price`, used only
-- by natural-flowers and artificial-flowers products for an
-- informational "starting from X" line above the fixed price.
--
-- Real curated ranges (price_min/price_max) already existed on many
-- flower products by the time this ran — this migration preserves
-- that data instead of discarding it: the higher bound (price_max)
-- becomes the new fixed price, and for natural/artificial-flowers
-- only, the lower bound (price_min) becomes starting_price. Every
-- other category simply collapses to its price_max with no starting
-- price (season prices were never actually used — all NULL — and
-- discount prices are being removed per spec, not carried over).

ALTER TABLE "products" ADD COLUMN "starting_price" DECIMAL;

UPDATE "products"
SET "starting_price" = "price_min"
WHERE "price_min" != "price_max"
  AND "category_id" IN (SELECT "id" FROM "categories" WHERE "slug" IN ('natural-flowers', 'artificial-flowers'));

UPDATE "products" SET "price" = "price_max";

ALTER TABLE "products" DROP COLUMN "discount_price";
ALTER TABLE "products" DROP COLUMN "price_min";
ALTER TABLE "products" DROP COLUMN "price_max";
ALTER TABLE "products" DROP COLUMN "season_price_min";
ALTER TABLE "products" DROP COLUMN "season_price_max";
