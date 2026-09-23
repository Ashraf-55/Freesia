# Freesia — Omni-Channel Upgrade — Progress Tracker

## Session 5 — UI/Branding/Auth/Hero upgrade (separate request from the omni-channel work below)
Four independent asks, all implemented:

1. **Favicon/logo.** The real Freesia logo (`public/images/brand/freesia_logo.png`)
   has a flower-pot glyph built into the "i" — cropped that out, cleaned a
   stray black shadow pixel that bled in from a neighboring letter, and
   generated `src/app/icon.png` (512×512, transparent), `src/app/apple-icon.png`
   (180×180, opaque blush-50 background — iOS doesn't render transparency
   well), and `src/app/favicon.ico` (multi-size 16/32/48), replacing the
   default Next.js placeholder. Declared them explicitly in
   `layout.tsx`'s `metadata.icons` too (belt-and-suspenders on top of the
   file-convention auto-detection).
2. **Arabic masculine/neutral phrasing.** Audited every Arabic string in
   `src/lib/i18n/dictionaries.ts` (confirmed via grep that **no** Arabic
   text lives outside this file) for feminine imperative/pronoun forms
   and fixed each one found: `تسوقي/اكتشفي/حاولي/سجّلي/تصفّحي/أضيفي
   (×3)/ابحثي (×2)/معملتيش (×3)/متأكدة/بتدوّري/بيكي` → masculine/neutral
   equivalents. Did NOT touch the English dictionary.
3. **Hero images.** Only one real full-width hero existed in the whole
   codebase (`/category/[slug]`) — extracted it into a reusable
   `src/components/hero-section.tsx` with a `clamp()`-based fluid height
   (scales smoothly with viewport instead of jumping between three fixed
   breakpoint heights) and a configurable `objectPosition` prop instead
   of a blind `object-fit: cover` centered crop. Added
   `Category.bannerObjectPosition` (nullable, migration
   `20260913010000`) so a banner whose focal point isn't centered can be
   fixed per-category. **Caveat:** there's no admin UI for categories at
   all yet (bannerImage itself is seed/DB-only) — setting
   `bannerObjectPosition` today means editing the DB directly (Prisma
   Studio) until a categories admin page exists. Out of scope for this
   request; flagging for whoever picks up next.
4. **Forgot/Reset Password — real, not mock.** `PasswordResetToken`
   model (migration `20260913020000`, hashed token — sha256, never the
   raw token — 1-hour expiry, single-use, cascades on user delete).
   `src/lib/password-reset.ts`: `requestPasswordReset` (always same
   generic outcome whether or not the email exists — no enumeration;
   per-account cooldown so one inbox can't be spammed) and
   `resetPasswordWithToken` (validates hash+unused+unexpired, updates
   only `passwordHash` — role/permissions/branchId untouched by
   construction since nothing else is in the update — and burns every
   other outstanding token for that user on success). `src/lib/email.ts`:
   real SMTP delivery via `nodemailer`, configured through
   `EMAIL_HOST`/`EMAIL_PORT`/`EMAIL_USER`/`EMAIL_PASSWORD`/`EMAIL_FROM`
   (added to `.env.example`, no secrets in the repo); if unset, logs
   loudly instead of pretending to send. IP rate limiting is an
   in-memory sliding window in `src/lib/password-reset.ts` — fine for
   this single-Node-process deployment, but **won't share state across
   multiple instances** if this ever runs behind a load balancer; swap
   `checkIpRateLimit` for a shared store then. Routes:
   `/api/auth/forgot-password`, `/api/auth/reset-password`. Pages:
   `/forgot-password`, `/reset-password` (the latter needed a
   `Suspense` boundary around the `useSearchParams()` form — split into
   `src/components/reset-password-form.tsx` + a thin page wrapper).
   Works identically for admin/employee/customer since it's keyed off
   `users.id`/`email` directly, not a role-specific table. Added
   "نسيت كلمة المرور؟" / "Forgot your password?" links to both
   `/login` and `/staff-login`.

**Not done in this session, must happen before trusting this is live:**
run `npx prisma generate && npx prisma migrate deploy` for the two new
migrations, set real `EMAIL_*` values and send a test reset email
end-to-end, and click through both the favicon and the category hero on
an actual phone — none of that was possible from this sandbox (see the
Prisma network-access note earlier in this file, which still applies).

## Session 4 — real bug found via the client actually running this (Phase 13 in action)
The client ran `prisma migrate deploy`/`reset` against a real Neon
database and seeding kept failing with `column products.name_en does not
exist`. Root cause: `schema.prisma`'s `Product.nameEn` / `descriptionEn`
(used everywhere in the storefront for the AR/EN toggle) were added at
some point **without ever getting a migration** — the exact same class
of gap as the `store_settings` fix in `20260910000000`, just missed
before because nothing had exercised a from-scratch `products` table
until now. Added `20260913000000_add_product_bilingual_columns`
(nullable `ALTER TABLE`, safe on existing data) and cross-checked every
other model's `@map`'d columns against the full migration history with a
script — nothing else came up missing. **This is exactly the kind of bug
Phase 13 said could only be caught by a real database — confirmed.**
Also confirmed, from the client's terminal output along the way: Neon's
pooled connection can't run `prisma migrate`'s shadow-database step
(added `directUrl` in `schema.prisma` + `DIRECT_URL` in `.env.example`
for this), and `DATABASE_URL`/`DIRECT_URL` must point at the exact same
database or you get confusing "column doesn't exist" errors that look
identical to this one but for a different reason (stale target DB, not a
missing migration) — worth remembering if this specific error resurfaces
for a different column later.

## Session 3 summary (this pass)
Audited every file from Phase 6 onward that a previous pass had touched
without reading back (same lesson as the Session-2 correction below) and
found/fixed real scoping bugs: transfer history and expense lists leaked
other branches' data to a branch-scoped employee; POS silently dropped
the walk-in customer's name/phone. Rewrote Reports (branch/employee
sales, inventory, expenses, profit summary, date+branch filters) and the
Dashboard (today's sales, branch performance, low stock, recent
activity) from scratch — both were still the pre-upgrade, online-only
versions. Confirmed Team's branch-assignment (Phase 11) was already
correct. Added a stock-by-warehouse + recent-movements panel to the
product edit page (spec §25). Ran a direct TypeScript-parser syntax
check across all 73 `.ts`/`.tsx` files in `src` (works without the
blocked Prisma engine download) — zero syntax errors as of the end of
this pass. **Still not run against a real database — see Phase 13.**

Read this file first in any new session before touching this feature set.
It tracks what's real/working vs. what's still planned, so work can
resume exactly where it left off without re-analysis and without
inventing shortcuts. Phases are executed in order; do not skip ahead.

Golden rule (unchanged from the spec): **no branch, warehouse, or
inventory quantity is ever created automatically** — not in `schema.prisma`,
not in `seed.ts`, not in app code. The admin creates every one of those by
hand from the dashboard. The system only *updates* quantities afterwards,
and only as the result of a real, recorded operation.

## Known environment limitation
This sandbox's network egress does not allow `binaries.prisma.sh`, so
`prisma generate` / `prisma migrate dev` / `prisma format` cannot run here
— every attempt fails on `403 Forbidden` fetching the schema/query engine.
The Prisma schema below was therefore hand-verified against
`prisma/migrations/20260911120000_.../migration.sql` field-by-field
instead of engine-validated. **First thing to do in a real dev machine
(or any sandbox with normal internet access): run `npx prisma generate`
and `npx prisma migrate dev` and fix any mismatch that surfaces** before
trusting the app to boot.

## Phase status

- [x] **Phase 0 — Analysis.** Read the whole project: Next.js 16 / React 19
  / Prisma 6 / PostgreSQL / NextAuth v5 (credentials, JWT sessions).
  Found an existing hand-written draft migration
  (`20260911120000_add_branches_warehouses_inventory_pos_expenses`) for
  branches/warehouses/inventory/movements/transfers/POS/expenses that had
  **never been reflected in `schema.prisma`** and had **zero app code**
  built on it (no routes, no services, no UI). Treated that migration as
  the source of truth for exact table/column shape and built everything
  else to match it.

- [x] **Phase 1 — Database layer.**
  - `prisma/schema.prisma`: added `Branch`, `Warehouse`, `Inventory`,
    `InventoryMovement`, `StockTransfer`, `StockTransferItem`, `PosSale`,
    `PosSaleItem`, `Expense`, `EmployeeExpense`, all enums, `User.branchId`,
    `StoreSettings.onlineFulfillmentWarehouseId`. `Product.stockQty` was
    **left untouched** (still used by the old single-location logic) —
    it is not read/written by any new code; see Phase 8 for its retirement
    plan.
  - `src/lib/inventory.ts`: the one place allowed to change
    `Inventory.quantity`. `recordMovement`/`recordMovements` (atomic,
    rejects negative results, rejects selling from a location with no
    recorded stock, always writes an `InventoryMovement`),
    `setInitialStock` (admin one-time entry), `executeStockTransfer`
    (atomic two-sided transfer), `getOnlineFulfillmentWarehouseId`,
    `getAvailableQuantity`.
  - `src/lib/permissions.ts`: added `branches.*`, `warehouses.*`,
    `inventory.adjust`, `inventory.transfer`, `pos.*`, `expenses.*`,
    `reports.all_branches`. Flows into `prisma/seed.ts` automatically
    (it upserts from the `PERMISSIONS` array — no hardcoded new rows
    added there).
  - `src/auth.ts`: session/JWT now carry `branchId` for the signed-in
    staff user (needed to scope POS/inventory views to "my branch only").
    Same caveat as the existing `permissions` field: it's set at sign-in
    time only (JWT session strategy) — if an admin reassigns an
    employee's branch, that employee must sign out/in to pick it up.
    This mirrors the pre-existing behavior for permission changes, not a
    new limitation introduced here.

- [x] **Phase 2 — Branches admin.** `/admin/branches`: list/create/edit/
  toggle status as inline server actions (matches the existing
  `/admin/customers` pattern instead of a separate API route — faster
  and consistent with the codebase). Permission-gated (`branches.view` /
  `branches.manage`). Zero branches created by default.

- [x] **Phase 3 — Warehouses admin.** `/admin/warehouses`: same pattern,
  type (main/branch/online_fulfillment), optional branch link
  (dropdown of branches the admin already created), status toggle.

- [x] **Phase 4 — Manual inventory entry + movement history.**
  `/admin/inventory` now has two sections: the untouched legacy
  single-number editor (collapsed, kept working as a fallback — see
  below) and a new per-warehouse section: pick a warehouse, see every
  product's real quantity there, set it (creates the `Inventory` row on
  first entry, adjusts it after — always through `recordMovement` with
  type `adjustment`, so it's always audited), and a live movement-history
  table for that warehouse. `/admin/settings` now also has "Online
  Fulfillment Location": a dropdown of the admin's own warehouses,
  nothing pre-selected.
  Added `getStorefrontAvailableQuantity()` in `src/lib/inventory.ts`:
  the storefront (product page "in stock" badge, cart validation,
  checkout) uses this. **Before** the admin picks a fulfillment
  warehouse it transparently falls back to the legacy `Product.stockQty`
  (nothing breaks, matches pre-upgrade behavior exactly). **After**, it
  switches to the real per-warehouse `Inventory` row automatically. This
  is the safe transition path spec §28 asked for — no invented data,
  nothing silently guessed.

## Session-2 correction
This file had marked Phase 5 `[x]` while the actual `/api/cart` and
`/api/checkout` routes on disk were still the untouched originals (only
the unused `src/lib/cart.ts` helper existed). Also found a real syntax
break in `src/lib/inventory.ts` — an orphaned comment block with no
opening `/**` right before `executeStockTransfer`, which would have
failed to compile. Both are now actually fixed — see below.
**Rule going forward: a checkbox here means the file was opened and read
after editing, not just written once.**

- [x] **Phase 5 — Cart, for real (now actually wired, verified by reading
  the files after editing).**
  - `src/lib/inventory.ts`: fixed the broken comment block.
  - `src/app/api/cart/route.ts`: rewritten. GET/POST/PATCH/DELETE all
    wrapped in try/catch with a real JSON error response (spec §22).
    POST/PATCH validate the requested quantity against
    `getStorefrontAvailableQuantity` and reject with 409 + the real
    available number if it's too high. PATCH/DELETE load the row first
    and call `ownsCartItem` — an `itemId` alone is never enough (spec
    §21).
  - `src/components/add-to-cart-button.tsx`: now actually checks
    `res.ok` before showing the success state (spec §16 — this was
    previously always showing "Added" even on a failed request).
  - `src/app/cart/page.tsx`: PATCH/DELETE/GET failures now show a real
    error message instead of failing silently; a full load failure shows
    a retry state instead of leaving the page blank (spec §22).
  - `src/app/api/register/route.ts` and `src/app/login/page.tsx`: both
    now call `mergeGuestCartIntoUser` (spec §19) — captures the guest
    session id before auth, merges after, quantities are summed and
    clamped to real available stock, nothing is silently dropped.
  - `src/app/api/checkout/route.ts`: rewritten. Re-reads cart + products
    from the DB (never trusts the client for price/stock); order-create
    + stock-deduct + cart-clear is one `$transaction`. Deducts from the
    Online Fulfillment Location via `recordMovement` (`online_sale`,
    tagged with the order id) when one is configured, else falls back to
    legacy `stockQty`, still inside the same transaction, still strict
    (spec §23-24 — two concurrent checkouts cannot both win the last
    unit).
  - `src/app/api/admin/orders/route.ts`: cancelling an order now
    restores stock automatically and idempotently (reverses the
    `online_sale` movement(s) with `cancelled_order_restore`, or
    increments legacy `stockQty`). Only fires on the pending→cancelled
    edge.

- [x] **Phase 6 — POS.** Verified by reading every file end-to-end.
  `/admin/pos` + `pos-terminal.tsx` (branch/warehouse pickers, live stock,
  search, cart, qty caps against real stock, discount gated on
  `pos.discount`) + `/api/admin/pos/stock` (branch-scoped: an employee
  can only ever query their own branch's warehouse) + `/api/admin/pos/sale`
  (re-validates branch/warehouse ownership server-side — never trusts the
  client — recomputes prices from the DB, one `$transaction` for the sale
  + `recordMovement` `pos_sale` deduction + invoice). Fixed one gap:
  `customerName`/`customerPhone` were parsed but never stored — now
  folded into the sale's `notes` since `PosSale.customerId` isn't backed
  by a real customer-lookup relation yet.

- [x] **Phase 7 — Stock transfers.** Verified. `/admin/transfers` +
  `transfer-form.tsx` + `/api/admin/transfers` on top of
  `executeStockTransfer` (atomic, rejects negative results). Fixed one
  gap: the transfer *history* table had no branch scoping, so an
  employee could see every branch's transfers — now filtered to
  transfers touching their own branch's warehouses when `user.role ===
  "employee"`.

- [x] **Phase 8 — Expenses & employee expenses.** Verified.
  `/admin/expenses`: general expenses + employee expenses (salary/
  advance/bonus/deduction/other), both listed with running totals. Fixed
  two gaps: the branch/employee dropdowns and both list queries had no
  scoping, so an employee with `expenses.view`/`expenses.manage` could
  see and file expenses against any branch — now scoped to their own
  branch, and the two server actions reject a `branchId` that isn't
  their own.

- [x] **Phase 9 — Reports.** Rewrote `/admin/reports` from the old
  online-only version to cover spec §15 in full: date range + branch
  filters (branch filter only shown to `reports.all_branches` holders;
  an employee without it is hard-scoped to their own branch server-side,
  not just hidden in the UI), online sales by status + top products
  (kept), branch POS sales + per-employee sales, inventory report
  (low-stock and out-of-stock across the scoped warehouses, recent
  movements, recent transfers), expense report (total, by category, by
  branch), and a profit summary (sales − expenses) with the "this is an
  estimate, no COGS yet" note the spec asked for.

- [x] **Phase 10 — Dashboard.** Rewrote `/admin` to add: today's online
  sales, today's POS sales, total expenses, branch performance (POS
  sales per branch), low stock across warehouses, recent orders/POS
  sales/expenses/transfers — all real queries, scoped to the signed-in
  user's branch unless they're admin or hold `reports.all_branches`.

- [x] **Phase 11 — Team branch assignment.** Verified already correct:
  `/admin/team` has an `assignBranch` server action gated on
  `team.edit`, a per-employee branch `<select>`, and a read-only branch
  label for viewers without edit rights.

- [ ] **Phase 12 — `Product.stockQty` retirement.** Deliberately left as
  a decision for the client: once every read/write path goes through
  `Inventory` (already true for cart/checkout/POS/transfers via the
  fallback in `getStorefrontAvailableQuantity`), decide whether to keep
  `stockQty` as a legacy denormalized total or drop it in a follow-up
  migration that migrates existing values into an admin-reviewed
  location rather than guessing one. Not started — no code currently
  assumes it's gone, so nothing is blocked on this.

- [ ] **Phase 13 — Full test pass.** Everything in spec §30 needs to run
  against a real Postgres with `prisma generate`/`migrate dev` actually
  executed — impossible in this sandbox (see the network limitation
  note above). Syntax-checked every `.ts`/`.tsx` file in `src` with the
  TypeScript parser directly (bypassing the blocked Prisma engine
  download) and found/fixed real issues this way twice already — but
  that only catches parse errors, not logic bugs that only show up
  against live data. **This phase must still be run for real** before
  calling any of this done: `npx prisma generate && npx prisma migrate
  dev`, then walk every scenario in spec §30 by hand (cart, inventory,
  branch, warehouse, POS, transfers, expenses) with real Postgres data.

## What's genuinely done vs. what still needs a human with a real database
Everything above compiles (verified via direct TypeScript parsing) and
was reviewed line-by-line for the specific failure modes spec called
out (ownership checks, stock races, branch leakage across roles,
silent success on failure). Twice in this session, work that had been
marked done on paper was not actually wired up or had a real bug — both
were caught by re-opening and reading the file, not by trusting the
checklist. **Nothing here has been run against a live server or
database.** Phase 13 is not optional busywork — it is the only way to
catch the class of bug that only appears at runtime (a bad Prisma
relation name, a migration that doesn't quite match schema.prisma, a
transaction isolation surprise). Do not treat this project as
production-ready until Phase 13 has actually happened.
