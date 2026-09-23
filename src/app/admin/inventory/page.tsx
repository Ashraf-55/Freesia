import { revalidatePath } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { hasPermission } from "@/lib/permissions";
import { getDictionary } from "@/lib/i18n";
import { recordMovement, InsufficientStockError } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ warehouseId?: string }>;
}) {
  const user = await requireStaff("inventory.view");
  const canUpdate = hasPermission(user.role, user.permissions, "inventory.update");
  const canAdjust = hasPermission(user.role, user.permissions, "inventory.adjust");
  const { locale, dict } = await getDictionary();
  const ip = dict.adminInventoryPage;

  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { stockQty: "asc" },
  });

  const { warehouseId: warehouseIdParam } = await searchParams;
  const warehouses = await prisma.warehouse.findMany({
    where: { status: "active" },
    orderBy: { name: "asc" },
  });
  const activeWarehouseId = warehouseIdParam ?? warehouses[0]?.id ?? null;
  const activeWarehouse = warehouses.find((w) => w.id === activeWarehouseId) ?? null;

  const [inventoryRows, movements] = activeWarehouseId
    ? await Promise.all([
        prisma.inventory.findMany({ where: { warehouseId: activeWarehouseId } }),
        prisma.inventoryMovement.findMany({
          where: { warehouseId: activeWarehouseId },
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { product: true, user: true },
        }),
      ])
    : [[], []];
  const qtyByProduct = new Map(inventoryRows.map((r) => [r.productId, r]));

  async function updateStock(formData: FormData) {
    "use server";
    await requireStaff("inventory.update");
    const id = String(formData.get("id"));
    const stockQty = Number(formData.get("stockQty"));
    if (Number.isNaN(stockQty) || stockQty < 0) return;
    await prisma.product.update({ where: { id }, data: { stockQty } });
    revalidatePath("/admin/inventory");
  }

  async function setWarehouseQuantity(formData: FormData) {
    "use server";
    const staffUser = await requireStaff("inventory.adjust");
    const productId = String(formData.get("productId"));
    const warehouseId = String(formData.get("warehouseId"));
    const newQuantity = Number(formData.get("newQuantity"));
    if (!productId || !warehouseId || Number.isNaN(newQuantity) || newQuantity < 0) return;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.inventory.findUnique({
        where: { productId_warehouseId: { productId, warehouseId } },
      });
      const currentQty = existing?.quantity ?? 0;
      const delta = newQuantity - currentQty;
      if (delta === 0) return;
      try {
        await recordMovement(tx, {
          productId,
          warehouseId,
          quantityChange: delta,
          movementType: "adjustment",
          userId: staffUser.id,
          notes: existing ? "Manual adjustment from Inventory page." : "Initial manual stock entry from Inventory page.",
        });
      } catch (e) {
        if (e instanceof InsufficientStockError) return; // silently ignore invalid negative result
        throw e;
      }
    });

    revalidatePath("/admin/inventory");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">{ip.title}</h1>

      {/* Legacy single-number stock (used only before a fulfillment warehouse is chosen) */}
      <details className="mb-8 rounded-[var(--radius-md)] bg-white p-4 shadow-[var(--shadow-soft)]">
        <summary className="cursor-pointer font-bold text-ink-900">{ip.legacyTitle}</summary>
        <p className="mb-4 mt-1 text-xs text-ink-500">{ip.legacyHint}</p>
        <div className="scroll-x-thin"><table className="w-full text-sm">
          <thead className="bg-blush-50 text-ink-700">
            <tr>
              <th className="p-3 text-start">{ip.product}</th>
              <th className="p-3 text-start">{ip.category}</th>
              <th className="p-3 text-start">{ip.quantity}</th>
              {canUpdate && <th className="p-3"></th>}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className={`border-t border-blush-100 ${p.stockQty <= 3 ? "bg-red-50" : ""}`}>
                <td className="p-3 font-medium text-ink-900">{p.name}</td>
                <td className="p-3 text-ink-700">{locale === "ar" ? p.category.nameAr : p.category.nameEn}</td>
                <td className="p-3 text-ink-700">{p.stockQty}</td>
                {canUpdate && (
                  <td className="p-3 text-end">
                    <form action={updateStock} className="flex items-center justify-end gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        type="number"
                        name="stockQty"
                        defaultValue={p.stockQty}
                        min={0}
                        className="w-20 rounded border border-ink-300 px-2 py-1 text-sm"
                      />
                      <button type="submit" className="btn-press text-xs text-coral-600 transition-colors hover:underline">{ip.update}</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table></div>
      </details>

      {/* Per-warehouse stock — the real Omni-Channel source of truth */}
      <h2 className="mb-3 text-lg font-bold text-ink-900">{ip.perWarehouseTitle}</h2>

      {warehouses.length === 0 ? (
        <p className="mb-8 rounded-[var(--radius-md)] bg-white p-4 text-sm text-ink-500 shadow-[var(--shadow-soft)]">{ip.noWarehouses}</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {warehouses.map((w) => (
              <Link
                key={w.id}
                href={`/admin/inventory?warehouseId=${w.id}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                  w.id === activeWarehouseId ? "bg-coral-500 text-white" : "bg-white text-ink-700 shadow-[var(--shadow-soft)]"
                }`}
              >
                {w.name}
              </Link>
            ))}
          </div>

          {activeWarehouse && (
            <>
              <div className="mb-8 overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
                <div className="scroll-x-thin"><table className="w-full text-sm">
                  <thead className="bg-blush-50 text-ink-700">
                    <tr>
                      <th className="p-3 text-start">{ip.product}</th>
                      <th className="p-3 text-start">{ip.quantity}</th>
                      {canAdjust && <th className="p-3"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const row = qtyByProduct.get(p.id);
                      const qty = row?.quantity ?? 0;
                      return (
                        <tr key={p.id} className={`border-t border-blush-100 ${qty <= 3 ? "bg-red-50" : ""}`}>
                          <td className="p-3 font-medium text-ink-900">{p.name}</td>
                          <td className="p-3 text-ink-700">{qty}</td>
                          {canAdjust && (
                            <td className="p-3 text-end">
                              <form action={setWarehouseQuantity} className="flex items-center justify-end gap-2">
                                <input type="hidden" name="productId" value={p.id} />
                                <input type="hidden" name="warehouseId" value={activeWarehouse.id} />
                                <input
                                  type="number"
                                  name="newQuantity"
                                  defaultValue={qty}
                                  min={0}
                                  className="w-20 rounded border border-ink-300 px-2 py-1 text-sm"
                                />
                                <button type="submit" className="btn-press text-xs text-coral-600 transition-colors hover:underline">{ip.setQuantity}</button>
                              </form>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table></div>
              </div>

              <h2 className="mb-3 text-lg font-bold text-ink-900">{ip.movementHistory}</h2>
              <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
                <div className="scroll-x-thin"><table className="w-full text-sm">
                  <thead className="bg-blush-50 text-ink-700">
                    <tr>
                      <th className="p-3 text-start">{ip.date}</th>
                      <th className="p-3 text-start">{ip.product}</th>
                      <th className="p-3 text-start">{ip.type}</th>
                      <th className="p-3 text-start">{ip.change}</th>
                      <th className="p-3 text-start">{ip.newBalance}</th>
                      <th className="p-3 text-start">{ip.notes}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                        <td className="p-3 whitespace-nowrap text-ink-700">{m.createdAt.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}</td>
                        <td className="p-3 text-ink-900">{m.product.name}</td>
                        <td className="p-3 text-ink-700">{m.movementType}</td>
                        <td className={`p-3 font-medium ${m.quantityChange >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                          {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                        </td>
                        <td className="p-3 text-ink-700">{m.newQuantity}</td>
                        <td className="p-3 text-ink-500">{m.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
                {movements.length === 0 && <p className="p-6 text-center text-sm text-ink-500">{ip.noMovements}</p>}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

