import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { hasPermission } from "@/lib/permissions";
import { getDictionary } from "@/lib/i18n";
import type { WarehouseType } from "@prisma/client";

export const dynamic = "force-dynamic";

const TYPES: WarehouseType[] = ["main", "branch", "online_fulfillment"];

export default async function AdminWarehousesPage() {
  const user = await requireStaff("warehouses.view");
  const { dict } = await getDictionary();
  const wp = dict.adminWarehousesPage;

  const [warehouses, branches] = await Promise.all([
    prisma.warehouse.findMany({
      orderBy: { createdAt: "asc" },
      include: { branch: true, _count: { select: { inventory: true } } },
    }),
    prisma.branch.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
  ]);

  const canManage = hasPermission(user.role, user.permissions, "warehouses.manage");
  const typeLabel = (t: WarehouseType) => (t === "main" ? wp.typeMain : t === "branch" ? wp.typeBranch : wp.typeOnline);

  async function addWarehouse(formData: FormData) {
    "use server";
    await requireStaff("warehouses.manage");
    const name = String(formData.get("name") ?? "").trim();
    const type = String(formData.get("type") ?? "") as WarehouseType;
    const branchId = String(formData.get("branchId") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    if (!name || !TYPES.includes(type)) return;

    await prisma.warehouse.create({
      data: {
        name,
        type,
        branchId: branchId || null,
        address: address || null,
      },
    });

    revalidatePath("/admin/warehouses");
  }

  async function updateWarehouse(formData: FormData) {
    "use server";
    await requireStaff("warehouses.manage");
    const id = String(formData.get("id"));
    const name = String(formData.get("name") ?? "").trim();
    const type = String(formData.get("type") ?? "") as WarehouseType;
    const branchId = String(formData.get("branchId") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    if (!id || !name || !TYPES.includes(type)) return;

    await prisma.warehouse.update({
      where: { id },
      data: { name, type, branchId: branchId || null, address: address || null },
    });

    revalidatePath("/admin/warehouses");
  }

  async function toggleStatus(formData: FormData) {
    "use server";
    await requireStaff("warehouses.manage");
    const id = String(formData.get("id"));
    const warehouse = await prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) return;
    await prisma.warehouse.update({
      where: { id },
      data: { status: warehouse.status === "active" ? "disabled" : "active" },
    });
    revalidatePath("/admin/warehouses");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">{wp.title}</h1>

      {canManage && (
        <form
          action={addWarehouse}
          className="mb-6 flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] bg-white p-4 shadow-[var(--shadow-soft)]"
        >
          <div>
            <label className="mb-1 block text-xs text-ink-500">{wp.name}</label>
            <input name="name" required className="w-40 rounded-[var(--radius-sm)] border border-ink-300 px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">{wp.type}</label>
            <select name="type" required defaultValue="" className="rounded-[var(--radius-sm)] border border-ink-300 px-3 py-1.5 text-sm">
              <option value="" disabled>
                —
              </option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {typeLabel(t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">{wp.branch}</label>
            <select name="branchId" defaultValue="" className="rounded-[var(--radius-sm)] border border-ink-300 px-3 py-1.5 text-sm">
              <option value="">{wp.noBranch}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">{wp.address}</label>
            <input name="address" className="w-48 rounded-[var(--radius-sm)] border border-ink-300 px-3 py-1.5 text-sm" />
          </div>
          <button type="submit" className="btn-press rounded-full bg-coral-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]">
            {wp.addWarehouse}
          </button>
        </form>
      )}

      <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
        <div className="scroll-x-thin"><table className="w-full text-sm">
          <thead className="bg-blush-50 text-ink-700">
            <tr>
              <th className="p-3 text-start">{wp.name}</th>
              <th className="p-3 text-start">{wp.type}</th>
              <th className="p-3 text-start">{wp.branch}</th>
              <th className="p-3 text-start">{wp.address}</th>
              <th className="p-3 text-start">{wp.status}</th>
              {canManage && <th className="p-3"></th>}
            </tr>
          </thead>
          <tbody>
            {warehouses.map((w) => (
              <tr key={w.id} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                {canManage ? (
                  <td className="p-2" colSpan={4}>
                    <form action={updateWarehouse} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={w.id} />
                      <input name="name" defaultValue={w.name} className="w-28 rounded border border-ink-300 px-2 py-1 text-sm" />
                      <select name="type" defaultValue={w.type} className="rounded border border-ink-300 px-2 py-1 text-sm">
                        {TYPES.map((t) => (
                          <option key={t} value={t}>
                            {typeLabel(t)}
                          </option>
                        ))}
                      </select>
                      <select name="branchId" defaultValue={w.branchId ?? ""} className="rounded border border-ink-300 px-2 py-1 text-sm">
                        <option value="">{wp.noBranch}</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                      <input name="address" defaultValue={w.address ?? ""} className="w-32 rounded border border-ink-300 px-2 py-1 text-sm" />
                      <button type="submit" className="btn-press text-xs text-coral-600 transition-colors hover:underline">{wp.save}</button>
                    </form>
                  </td>
                ) : (
                  <>
                    <td className="p-3 font-medium text-ink-900">{w.name}</td>
                    <td className="p-3 text-ink-700">{typeLabel(w.type)}</td>
                    <td className="p-3 text-ink-700">{w.branch?.name ?? wp.noBranch}</td>
                    <td className="p-3 text-ink-700">{w.address ?? "—"}</td>
                  </>
                )}
                <td className="p-3">
                  <span
                    className={
                      w.status === "active"
                        ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                        : "rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600"
                    }
                  >
                    {w.status === "active" ? wp.active : wp.disabled}
                  </span>
                </td>
                {canManage && (
                  <td className="p-3 text-end">
                    <form action={toggleStatus}>
                      <input type="hidden" name="id" value={w.id} />
                      <button type="submit" className="btn-press text-xs text-[var(--error)] transition-colors hover:underline">
                        {w.status === "active" ? wp.disable : wp.enable}
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table></div>
        {warehouses.length === 0 && <p className="p-6 text-center text-sm text-ink-500">{wp.empty}</p>}
      </div>
    </div>
  );
}
