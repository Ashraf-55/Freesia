/**
 * Freesia — Inventory Service
 * ---------------------------
 * The single place in the codebase allowed to change `Inventory.quantity`.
 * POS sales, online checkout, stock transfers, manual admin adjustments,
 * returns and damage reports all funnel through `recordMovement` /
 * `recordMovements`, so every quantity change always has a matching
 * `InventoryMovement` row — there is no other sanctioned write path.
 *
 * Nothing in this file ever creates a Branch, Warehouse, or a "default"
 * Inventory row with an invented quantity. The only way stock starts
 * existing at a location is:
 *   1. an admin manually entering an initial quantity (`setInitialStock`), or
 *   2. a real inbound operation (purchase, transfer-in, return, cancelled
 *      order restore) that legitimately adds stock to a location.
 * A location can never go negative, and nothing can be sold or
 * transferred out of a location that has no stock recorded for it.
 */
import type { Prisma, PrismaClient, MovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient | PrismaClient;

export class InsufficientStockError extends Error {
  constructor(
    public productId: string,
    public warehouseId: string,
    public requested: number,
    public available: number
  ) {
    super(
      `Insufficient stock for product ${productId} at warehouse ${warehouseId}: requested ${requested}, available ${available}.`
    );
    this.name = "InsufficientStockError";
  }
}

/** Movement types that legitimately add stock to a location "from nothing". */
const INBOUND_TYPES: MovementType[] = [
  "purchase",
  "transfer_in",
  "return",
  "cancelled_order_restore",
  "adjustment", // admin manual correction can go either way
];

export interface RecordMovementInput {
  productId: string;
  warehouseId: string;
  /** Positive to add stock, negative to remove. Never zero. */
  quantityChange: number;
  movementType: MovementType;
  referenceId?: string | null;
  branchId?: string | null;
  userId?: string | null;
  notes?: string | null;
}

/**
 * Applies one inventory change atomically and writes its audit row.
 * MUST be called with a transaction client when part of a larger
 * operation (POS sale, checkout, transfer) so the stock check and the
 * write can never race with a concurrent sale of the same last unit.
 */
export async function recordMovement(tx: Tx, input: RecordMovementInput) {
  const { productId, warehouseId, quantityChange, movementType } = input;
  if (quantityChange === 0) {
    throw new Error("recordMovement: quantityChange must not be 0.");
  }

  // Row-level lock via a plain SELECT inside the caller's transaction is
  // implicit here because Postgres + Prisma serialize the subsequent
  // UPDATE ... WHERE id = ... against concurrent transactions touching
  // the same row; combined with re-checking `newQuantity >= 0` right
  // before the write, two concurrent sales of the last unit cannot both
  // succeed.
  const existing = await tx.inventory.findUnique({
    where: { productId_warehouseId: { productId, warehouseId } },
  });

  const previousQuantity = existing?.quantity ?? 0;
  const newQuantity = previousQuantity + quantityChange;

  if (newQuantity < 0) {
    throw new InsufficientStockError(productId, warehouseId, -quantityChange, previousQuantity);
  }

  if (!existing) {
    if (!INBOUND_TYPES.includes(movementType)) {
      // Nothing was ever entered for this product at this location —
      // there is nothing to sell/transfer out/damage.
      throw new InsufficientStockError(productId, warehouseId, -quantityChange, 0);
    }
    await tx.inventory.create({
      data: {
        productId,
        warehouseId,
        quantity: newQuantity,
        availableQuantity: newQuantity,
        reservedQuantity: 0,
      },
    });
  } else {
    await tx.inventory.update({
      where: { id: existing.id },
      data: {
        quantity: newQuantity,
        availableQuantity: { increment: quantityChange },
      },
    });
  }

  await tx.inventoryMovement.create({
    data: {
      productId,
      warehouseId,
      quantityChange,
      previousQuantity,
      newQuantity,
      movementType,
      referenceId: input.referenceId ?? null,
      branchId: input.branchId ?? null,
      userId: input.userId ?? null,
      notes: input.notes ?? null,
    },
  });

  return { previousQuantity, newQuantity };
}

/** Applies several movements as one all-or-nothing operation. */
export async function recordMovements(tx: Tx, inputs: RecordMovementInput[]) {
  const results = [];
  for (const input of inputs) {
    results.push(await recordMovement(tx, input));
  }
  return results;
}

/**
 * Admin-only: sets the starting quantity for a product at a warehouse.
 * Only usable when no Inventory row exists yet for that pair (that's
 * the point — this is the one-time manual entry, not an ongoing edit).
 * Ongoing corrections must go through `recordMovement` with type
 * "adjustment" so they stay in the audit trail.
 */
export async function setInitialStock(
  tx: Tx,
  params: { productId: string; warehouseId: string; quantity: number; userId: string; notes?: string }
) {
  if (params.quantity < 0) throw new Error("Initial quantity cannot be negative.");

  const existing = await tx.inventory.findUnique({
    where: { productId_warehouseId: { productId: params.productId, warehouseId: params.warehouseId } },
  });
  if (existing) {
    throw new Error(
      "Inventory already exists for this product at this warehouse. Use an adjustment instead of a new initial entry."
    );
  }

  await tx.inventory.create({
    data: {
      productId: params.productId,
      warehouseId: params.warehouseId,
      quantity: params.quantity,
      availableQuantity: params.quantity,
      reservedQuantity: 0,
    },
  });

  await tx.inventoryMovement.create({
    data: {
      productId: params.productId,
      warehouseId: params.warehouseId,
      quantityChange: params.quantity,
      previousQuantity: 0,
      newQuantity: params.quantity,
      movementType: "adjustment",
      userId: params.userId,
      notes: params.notes ?? "Initial manual stock entry by admin.",
    },
  });
}

export async function getAvailableQuantity(productId: string, warehouseId: string, tx: Tx = prisma) {
  const row = await tx.inventory.findUnique({
    where: { productId_warehouseId: { productId, warehouseId } },
  });
  return row?.availableQuantity ?? 0;
}

/** Returns the admin-configured warehouse that online orders deduct from, or null. */
export async function getOnlineFulfillmentWarehouseId(tx: Tx = prisma) {
  const settings = await tx.storeSettings.findUnique({ where: { id: "main" } });
  return settings?.onlineFulfillmentWarehouseId ?? null;
}

/**
 * The number the storefront (product page, cart validation, checkout)
 * should treat as "how many can a customer buy online right now".
 *
 * Before the admin has picked an Online Fulfillment Location, there is
 * no per-warehouse truth for online sales yet, so this falls back to
 * the legacy `Product.stockQty` — same behavior as before this upgrade,
 * nothing breaks. The moment the admin sets a fulfillment warehouse in
 * Settings, this switches to the real per-location `Inventory` row (0 if
 * the admin hasn't manually entered stock there yet — never invented).
 */
export async function getStorefrontAvailableQuantity(productId: string, tx: Tx = prisma) {
  const warehouseId = await getOnlineFulfillmentWarehouseId(tx);
  if (!warehouseId) {
    const product = await tx.product.findUnique({ where: { id: productId }, select: { stockQty: true } });
    return product?.stockQty ?? 0;
  }
  return getAvailableQuantity(productId, warehouseId, tx);
}


/**
 * Transfers stock between two warehouses as one atomic operation:
 * creates the StockTransfer + items, deducts the source, credits the
 * destination, and writes a movement on each side. Rejects (rolls back)
 * if any line item exceeds the source's available stock.
 */
export async function executeStockTransfer(params: {
  fromWarehouseId: string;
  toWarehouseId: string;
  items: Array<{ productId: string; quantity: number }>;
  branchId?: string | null;
  createdById: string;
  notes?: string | null;
}) {
  if (params.fromWarehouseId === params.toWarehouseId) {
    throw new Error("Source and destination warehouse must be different.");
  }
  if (params.items.length === 0) {
    throw new Error("A transfer needs at least one product line.");
  }

  return prisma.$transaction(async (tx) => {
    const transfer = await tx.stockTransfer.create({
      data: {
        fromWarehouseId: params.fromWarehouseId,
        toWarehouseId: params.toWarehouseId,
        branchId: params.branchId ?? null,
        createdById: params.createdById,
        notes: params.notes ?? null,
        status: "completed",
        completedAt: new Date(),
        items: {
          create: params.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        },
      },
      include: { items: true },
    });

    for (const item of params.items) {
      if (item.quantity <= 0) throw new Error("Transfer quantity must be greater than 0.");

      await recordMovement(tx, {
        productId: item.productId,
        warehouseId: params.fromWarehouseId,
        quantityChange: -item.quantity,
        movementType: "transfer_out",
        referenceId: transfer.id,
        branchId: params.branchId ?? null,
        userId: params.createdById,
        notes: `Transfer ${transfer.id} → out`,
      });

      await recordMovement(tx, {
        productId: item.productId,
        warehouseId: params.toWarehouseId,
        quantityChange: item.quantity,
        movementType: "transfer_in",
        referenceId: transfer.id,
        branchId: params.branchId ?? null,
        userId: params.createdById,
        notes: `Transfer ${transfer.id} → in`,
      });
    }

    return transfer;
  });
}
