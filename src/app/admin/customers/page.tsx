import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { hasPermission } from "@/lib/permissions";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const user = await requireStaff("customers.view");
  const { dict } = await getDictionary();
  const cp = dict.adminCustomersPage;

  const customers = await prisma.user.findMany({
    where: { role: "customer" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
  });

  const canAdd = hasPermission(user.role, user.permissions, "customers.add");
  const canEdit = hasPermission(user.role, user.permissions, "customers.edit");
  const canDelete = hasPermission(user.role, user.permissions, "customers.delete");

  async function addCustomer(formData: FormData) {
    "use server";
    await requireStaff("customers.add");
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const phone = String(formData.get("phone") ?? "").trim();
    if (!name || !email) return;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return;

    const passwordHash = await bcrypt.hash("Freesia@Temp123", 10);
    await prisma.user.create({ data: { name, email, phone, passwordHash, role: "customer" } });
    revalidatePath("/admin/customers");
  }

  async function updateCustomer(formData: FormData) {
    "use server";
    await requireStaff("customers.edit");
    const id = String(formData.get("id"));
    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    await prisma.user.updateMany({ where: { id, role: "customer" }, data: { name, phone } });
    revalidatePath("/admin/customers");
  }

  async function deleteCustomer(formData: FormData) {
    "use server";
    await requireStaff("customers.delete");
    const id = String(formData.get("id"));
    await prisma.user.deleteMany({ where: { id, role: "customer" } });
    revalidatePath("/admin/customers");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">{cp.title}</h1>

      {canAdd && (
        <form action={addCustomer} className="mb-6 flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] bg-white p-4 shadow-[var(--shadow-soft)]">
          <div>
            <label className="mb-1 block text-xs text-ink-500">{cp.name}</label>
            <input name="name" required className="rounded-[var(--radius-sm)] border border-ink-300 px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">{cp.email}</label>
            <input type="email" name="email" required className="rounded-[var(--radius-sm)] border border-ink-300 px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">{cp.phone}</label>
            <input name="phone" className="rounded-[var(--radius-sm)] border border-ink-300 px-3 py-1.5 text-sm" />
          </div>
          <button type="submit" className="btn-press rounded-full bg-coral-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]">
            {cp.addCustomer}
          </button>
          <p className="w-full text-xs text-ink-500">{cp.tempPasswordNote}</p>
        </form>
      )}

      <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
        <div className="scroll-x-thin"><table className="w-full text-sm">
          <thead className="bg-blush-50 text-ink-700">
            <tr>
              <th className="p-3 text-start">{cp.name}</th>
              <th className="p-3 text-start">{cp.email}</th>
              <th className="p-3 text-start">{cp.phone}</th>
              <th className="p-3 text-start">{cp.ordersCount}</th>
              {(canEdit || canDelete) && <th className="p-3"></th>}
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                {canEdit ? (
                  <>
                    <td className="p-2">
                      <form action={updateCustomer} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={c.id} />
                        <input name="name" defaultValue={c.name} className="w-32 rounded border border-ink-300 px-2 py-1 text-sm" />
                        <input name="phone" defaultValue={c.phone ?? ""} className="w-28 rounded border border-ink-300 px-2 py-1 text-sm" />
                        <button type="submit" className="btn-press text-xs text-coral-600 transition-colors hover:underline">{cp.save}</button>
                      </form>
                    </td>
                    <td className="p-3 text-ink-700">{c.email}</td>
                    <td className="p-3 text-ink-700">{c.phone ?? "—"}</td>
                  </>
                ) : (
                  <>
                    <td className="p-3 font-medium text-ink-900">{c.name}</td>
                    <td className="p-3 text-ink-700">{c.email}</td>
                    <td className="p-3 text-ink-700">{c.phone ?? "—"}</td>
                  </>
                )}
                <td className="p-3 text-ink-700">{c._count.orders}</td>
                {(canEdit || canDelete) && (
                  <td className="p-3 text-end">
                    {canDelete && (
                      <form action={deleteCustomer}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="btn-press text-xs text-[var(--error)] transition-colors hover:underline">{cp.delete}</button>
                      </form>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
