import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { hasPermission, PERMISSIONS_BY_MODULE, type PermissionCode } from "@/lib/permissions";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const actor = await requireStaff("team.view");
  const { locale, dict } = await getDictionary();
  const tp = dict.adminTeamPage;

  const employees = await prisma.user.findMany({
    where: { role: "employee" },
    orderBy: { createdAt: "desc" },
    include: { employeePermissions: true, branch: true },
  });
  const branches = await prisma.branch.findMany({ where: { status: "active" }, orderBy: { name: "asc" } });

  const canAdd = hasPermission(actor.role, actor.permissions, "team.add");
  const canEdit = hasPermission(actor.role, actor.permissions, "team.edit");
  const canManagePerms = hasPermission(actor.role, actor.permissions, "team.manage_permissions");
  const canChangePassword = hasPermission(actor.role, actor.permissions, "team.change_password");
  const canToggleStatus = hasPermission(actor.role, actor.permissions, "team.toggle_status");
  const canDelete = hasPermission(actor.role, actor.permissions, "team.delete");

  async function addEmployee(formData: FormData) {
    "use server";
    await requireStaff("team.add");
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (!name || !email || password.length < 8 || password !== confirm) return;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return;

    const passwordHash = await bcrypt.hash(password, 10);
    // Role hard-coded to 'employee' — this action can never create an admin.
    await prisma.user.create({ data: { name, email, passwordHash, role: "employee" } });
    revalidatePath("/admin/team");
  }

  async function updatePermissions(formData: FormData) {
    "use server";
    const actorNow = await requireStaff("team.manage_permissions");
    const empId = String(formData.get("empId"));
    if (empId === actorNow.id) return; // defense in depth: can't edit own permissions

    const target = await prisma.user.findUnique({ where: { id: empId } });
    if (!target || target.role !== "employee") return;

    const validCodes = new Set(Object.values(PERMISSIONS_BY_MODULE).flat().map((p) => p.code));
    const selected = formData.getAll("permissions").map(String).filter((c) => validCodes.has(c as PermissionCode));

    await prisma.employeePermission.deleteMany({ where: { userId: empId } });
    await prisma.employeePermission.createMany({
      data: selected.map((code) => ({ userId: empId, permissionCode: code })),
    });
    revalidatePath("/admin/team");
  }

  async function changePassword(formData: FormData) {
    "use server";
    await requireStaff("team.change_password");
    const empId = String(formData.get("empId"));
    const password = String(formData.get("password") ?? "");
    if (password.length < 8) return;
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.updateMany({ where: { id: empId, role: "employee" }, data: { passwordHash } });
    revalidatePath("/admin/team");
  }

  async function toggleStatus(formData: FormData) {
    "use server";
    await requireStaff("team.toggle_status");
    const empId = String(formData.get("empId"));
    const target = await prisma.user.findFirst({ where: { id: empId, role: "employee" } });
    if (!target) return;
    await prisma.user.update({
      where: { id: empId },
      data: { status: target.status === "active" ? "disabled" : "active" },
    });
    revalidatePath("/admin/team");
  }

  async function assignBranch(formData: FormData) {
    "use server";
    await requireStaff("team.edit");
    const empId = String(formData.get("empId"));
    const branchId = String(formData.get("branchId") ?? "").trim();
    await prisma.user.updateMany({ where: { id: empId, role: "employee" }, data: { branchId: branchId || null } });
    revalidatePath("/admin/team");
  }

  async function deleteEmployee(formData: FormData) {
    "use server";
    await requireStaff("team.delete");
    const empId = String(formData.get("empId"));
    await prisma.user.deleteMany({ where: { id: empId, role: "employee" } });
    revalidatePath("/admin/team");
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-6 text-2xl font-bold text-ink-900">{tp.title}</h1>

        {canAdd && (
          <form action={addEmployee} className="mb-8 flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] bg-white p-4 shadow-[var(--shadow-soft)]">
            <div>
              <label className="mb-1 block text-xs text-ink-500">{tp.name}</label>
              <input name="name" required className="rounded-[var(--radius-sm)] border border-ink-300 px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-500">{tp.email}</label>
              <input type="email" name="email" required className="rounded-[var(--radius-sm)] border border-ink-300 px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-500">{tp.password}</label>
              <input type="password" name="password" required minLength={8} className="rounded-[var(--radius-sm)] border border-ink-300 px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-500">{tp.confirmPassword}</label>
              <input type="password" name="confirm" required minLength={8} className="rounded-[var(--radius-sm)] border border-ink-300 px-3 py-1.5 text-sm" />
            </div>
            <button type="submit" className="btn-press rounded-full bg-coral-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]">
              {tp.addEmployee}
            </button>
          </form>
        )}

        <div className="space-y-6">
          {employees.map((emp) => {
            const grantedCodes = new Set(emp.employeePermissions.map((p) => p.permissionCode));
            const isSelf = emp.id === actor.id;
            return (
              <div key={emp.id} className="rounded-[var(--radius-md)] bg-white p-5 shadow-[var(--shadow-soft)]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink-900">{emp.name}</p>
                    <p className="text-sm text-ink-500">{emp.email}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${emp.status === "active" ? "bg-green-100 text-green-700" : "bg-ink-100 text-ink-500"}`}>
                      {emp.status === "active" ? tp.active : tp.disabled}
                    </span>
                    {canToggleStatus && (
                      <form action={toggleStatus}>
                        <input type="hidden" name="empId" value={emp.id} />
                        <button type="submit" className="btn-press text-coral-600 transition-colors hover:underline">
                          {emp.status === "active" ? tp.disable : tp.enable}
                        </button>
                      </form>
                    )}
                    {canDelete && (
                      <form action={deleteEmployee}>
                        <input type="hidden" name="empId" value={emp.id} />
                        <button type="submit" className="btn-press text-[var(--error)] transition-colors hover:underline">{tp.delete}</button>
                      </form>
                    )}
                  </div>
                </div>

                {canChangePassword && (
                  <form action={changePassword} className="mb-4 flex items-end gap-2">
                    <input type="hidden" name="empId" value={emp.id} />
                    <div>
                      <label className="mb-1 block text-xs text-ink-500">{tp.newPassword}</label>
                      <input type="password" name="password" minLength={8} required className="rounded border border-ink-300 px-2 py-1 text-sm" />
                    </div>
                    <button type="submit" className="btn-press text-xs text-coral-600 transition-colors hover:underline">{tp.changePassword}</button>
                  </form>
                )}

                {canEdit && (
                  <form action={assignBranch} className="mb-4 flex items-end gap-2">
                    <input type="hidden" name="empId" value={emp.id} />
                    <div>
                      <label className="mb-1 block text-xs text-ink-500">{tp.branch}</label>
                      <select name="branchId" defaultValue={emp.branchId ?? ""} className="rounded border border-ink-300 px-2 py-1 text-sm">
                        <option value="">{tp.noBranch}</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="btn-press text-xs text-coral-600 transition-colors hover:underline">{tp.saveBranch}</button>
                  </form>
                )}
                {!canEdit && (
                  <p className="mb-4 text-xs text-ink-500">
                    {tp.branch}: {emp.branch?.name ?? tp.noBranch}
                  </p>
                )}

                {canManagePerms && !isSelf && (
                  <form action={updatePermissions} className="border-t border-blush-100 pt-4">
                    <input type="hidden" name="empId" value={emp.id} />
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      {Object.entries(PERMISSIONS_BY_MODULE).map(([module, perms]) => (
                        <div key={module}>
                          <p className="mb-1 text-xs font-bold text-ink-500">{module}</p>
                          {perms.map((p) => (
                            <label key={p.code} className="flex items-center gap-2 py-0.5 text-sm text-ink-700">
                              <input type="checkbox" name="permissions" value={p.code} defaultChecked={grantedCodes.has(p.code)} />
                              {locale === "ar" ? p.labelAr : p.labelEn}
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                    <button type="submit" className="btn-press mt-3 rounded-full bg-ink-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-300 hover:bg-ink-700 hover:shadow-lg">
                      {tp.savePermissions}
                    </button>
                  </form>
                )}
                {isSelf && <p className="border-t border-blush-100 pt-4 text-xs text-ink-500">{tp.selfNote}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
