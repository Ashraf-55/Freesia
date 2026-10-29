-- Price Range (spec 2026-09-26): "today price" (priceMin/priceMax,
-- required going forward) and an optional, fully independent "season
-- price" (seasonPriceMin/seasonPriceMax, nullable on both ends).
--
-- The legacy `price` / `discount_price` columns are NOT touched or
-- dropped: Cart, Checkout, Orders, POS and Reports all snapshot their
-- totals from `price`/`discount_price` at the moment of purchase, so
-- removing them would change how historical order math is derived.
-- The admin form keeps `price` in sync with `price_min` on save.
--
-- Existing products are backfilled so `price_min = price_max = price`
-- — visually identical to a single price until an admin edits a
-- product to set a real range. Nothing here can fail on old data:
-- every row gets a value, so no NOT NULL constraint is violated.

ALTER TABLE "products" ADD COLUMN "price_min" DECIMAL;
ALTER TABLE "products" ADD COLUMN "price_max" DECIMAL;
ALTER TABLE "products" ADD COLUMN "season_price_min" DECIMAL;
ALTER TABLE "products" ADD COLUMN "season_price_max" DECIMAL;

UPDATE "products" SET "price_min" = "price", "price_max" = "price" WHERE "price_min" IS NULL;
