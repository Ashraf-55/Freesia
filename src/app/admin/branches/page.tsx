import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { hasPermission } from "@/lib/permissions";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminBranchesPage() {
  const user = await requireStaff("branches.view");
  const { dict } = await getDictionary();
  const bp = dict.adminBranchesPage;

  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { employees: true, warehouses: true } } },
  });

  const canManage = hasPermission(user.role, user.permissions, "branches.manage");

  async function addBranch(formData: FormData) {
    "use server";
    await requireStaff("branches.manage");
    const name = String(formData.get("name") ?? "").trim();
    const branchCode = String(formData.get("branchCode") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    if (!name || !branchCode) return;

    await prisma.branch
      .create({
        data: {
          name,
          branchCode,
          address: address || null,
          phone: phone || null,
        },
      })
      .catch(() => null); // duplicate branchCode — silently no-op, admin retries with a different code

    revalidatePath("/admin/branches");
  }

  async function updateBranch(formData: FormData) {
    "use server";
    await requireStaff("branches.manage");
    const id = String(formData.get("id"));
    const name = String(formData.get("name") ?? "").trim();
    const branchCode = String(formData.get("branchCode") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    if (!id || !name || !branchCode) return;

    await prisma.branch
      .update({
        where: { id },
        data: { name, branchCode, address: address || null, phone: phone || null },
      })
      .catch(() => null);

    revalidatePath("/admin/branches");
  }

  async function toggleStatus(formData: FormData) {
    "use server";
    await requireStaff("branches.manage");
    const id = String(formData.get("id"));
    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) return;
    await prisma.branch.update({
      where: { id },
      data: { status: branch.status === "active" ? "disabled" : "active" },
    });
    revalidatePath("/admin/branches");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">{bp.title}</h1>

      {canManage && (
        <form
          action={addBranch}
          className="mb-6 flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] bg-white p-4 shadow-[var(--shadow-soft)]"
        >
          <div>
            <label className="mb-1 block text-xs text-ink-500">{bp.name}</label>
            <input name="name" required className="w-40 rounded-[var(--radius-sm)] border border-ink-300 px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">{bp.branchCode}</label>
            <input name="branchCode" required className="w-28 rounded-[var(--radius-sm)] border border-ink-300 px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">{bp.address}</label>
            <input name="address" className="w-48 rounded-[var(--radius-sm)] border border-ink-300 px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">{bp.phone}</label>
            <input name="phone" className="w-36 rounded-[var(--radius-sm)] border border-ink-300 px-3 py-1.5 text-sm" />
          </div>
          <button type="submit" className="btn-press rounded-full bg-coral-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]">
            {bp.addBranch}
          </button>
        </form>
      )}

      <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
        <div className="scroll-x-thin"><table className="w-full text-sm">
          <thead className="bg-blush-50 text-ink-700">
            <tr>
              <th className="p-3 text-start">{bp.name}</th>
              <th className="p-3 text-start">{bp.branchCode}</th>
              <th className="p-3 text-start">{bp.address}</th>
              <th className="p-3 text-start">{bp.phone}</th>
              <th className="p-3 text-start">{bp.employees}</th>
              <th className="p-3 text-start">{bp.warehouses}</th>
              <th className="p-3 text-start">{bp.status}</th>
              {canManage && <th className="p-3"></th>}
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                {canManage ? (
                  <>
                    <td className="p-2">
                      <form action={updateBranch} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={b.id} />
                        <input name="name" defaultValue={b.name} className="w-28 rounded border border-ink-300 px-2 py-1 text-sm" />
                        <input name="branchCode" defaultValue={b.branchCode} className="w-20 rounded border border-ink-300 px-2 py-1 text-sm" />
                        <input name="address" defaultValue={b.address ?? ""} className="w-32 rounded border border-ink-300 px-2 py-1 text-sm" />
                        <input name="phone" defaultValue={b.phone ?? ""} className="w-24 rounded border border-ink-300 px-2 py-1 text-sm" />
                        <button type="submit" className="btn-press text-xs text-coral-600 transition-colors hover:underline">{bp.save}</button>
                      </form>
                    </td>
                    <td className="p-3 text-ink-700" colSpan={3}></td>
                  </>
                ) : (
                  <>
                    <td className="p-3 font-medium text-ink-900">{b.name}</td>
                    <td className="p-3 text-ink-700">{b.branchCode}</td>
                    <td className="p-3 text-ink-700">{b.address ?? "—"}</td>
                    <td className="p-3 text-ink-700">{b.phone ?? "—"}</td>
                  </>
                )}
                <td className="p-3 text-ink-700">{b._count.employees}</td>
                <td className="p-3 text-ink-700">{b._count.warehouses}</td>
                <td className="p-3">
                  <span
                    className={
                      b.status === "active"
                        ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                        : "rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600"
                    }
                  >
                    {b.status === "active" ? bp.active : bp.disabled}
                  </span>
                </td>
                {canManage && (
                  <td className="p-3 text-end">
                    <form action={toggleStatus}>
                      <input type="hidden" name="id" value={b.id} />
                      <button type="submit" className="btn-press text-xs text-[var(--error)] transition-colors hover:underline">
                        {b.status === "active" ? bp.disable : bp.enable}
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table></div>
        {branches.length === 0 && <p className="p-6 text-center text-sm text-ink-500">{bp.empty}</p>}
      </div>
    </div>
  );
}
