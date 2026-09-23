import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { hasPermission } from "@/lib/permissions";
import { getDictionary } from "@/lib/i18n";
import type { ExpenseCategory, EmployeeExpenseType } from "@prisma/client";

export const dynamic = "force-dynamic";

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "electricity",
  "rent",
  "water",
  "internet",
  "salaries",
  "employee_advance",
  "employee_bonus",
  "shipping",
  "maintenance",
  "purchases",
  "marketing",
  "other",
];

const EMPLOYEE_EXPENSE_TYPES: EmployeeExpenseType[] = ["salary", "advance", "bonus", "deduction", "other"];

export default async function AdminExpensesPage() {
  const user = await requireStaff("expenses.view");
  const { locale, dict } = await getDictionary();
  const ep = dict.adminExpensesPage;
  const canManage = hasPermission(user.role, user.permissions, "expenses.manage");

  const categoryLabel = (c: ExpenseCategory) =>
    ({
      electricity: ep.categoryElectricity,
      rent: ep.categoryRent,
      water: ep.categoryWater,
      internet: ep.categoryInternet,
      salaries: ep.categorySalaries,
      employee_advance: ep.categoryEmployeeAdvance,
      employee_bonus: ep.categoryEmployeeBonus,
      shipping: ep.categoryShipping,
      maintenance: ep.categoryMaintenance,
      purchases: ep.categoryPurchases,
      marketing: ep.categoryMarketing,
      other: ep.categoryOther,
    })[c];

  const typeLabel = (t: EmployeeExpenseType) =>
    ({ salary: ep.typeSalary, advance: ep.typeAdvance, bonus: ep.typeBonus, deduction: ep.typeDeduction, other: ep.typeOther })[t];

  const branchWhere = user.role === "employee" ? { id: user.branchId ?? "__none__" } : {};
  const expenseScope =
    user.role === "employee" ? { branchId: user.branchId ?? "__none__" } : {};

  const [branches, employees, expenses, employeeExpenses] = await Promise.all([
    prisma.branch.findMany({ where: { status: "active", ...branchWhere }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { role: { in: ["employee", "admin"] }, ...(user.role === "employee" ? { branchId: user.branchId ?? "__none__" } : {}) },
      orderBy: { name: "asc" },
    }),
    prisma.expense.findMany({ where: expenseScope, orderBy: { expenseDate: "desc" }, take: 50, include: { branch: true, createdBy: true } }),
    prisma.employeeExpense.findMany({ where: expenseScope, orderBy: { date: "desc" }, take: 50, include: { employee: true, branch: true, createdBy: true } }),
  ]);

  const totalGeneral = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalEmployee = employeeExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  async function addExpense(formData: FormData) {
    "use server";
    await requireStaff("expenses.manage");
    const branchId = String(formData.get("branchId") ?? "").trim();
    const category = String(formData.get("category") ?? "") as ExpenseCategory;
    const amount = Number(formData.get("amount"));
    const description = String(formData.get("description") ?? "").trim();
    const expenseDate = String(formData.get("expenseDate") ?? "");
    if (!EXPENSE_CATEGORIES.includes(category) || Number.isNaN(amount) || amount <= 0 || !expenseDate) return;
    if (user.role === "employee" && branchId && branchId !== user.branchId) return;

    await prisma.expense.create({
      data: {
        branchId: branchId || null,
        category,
        amount,
        description: description || null,
        expenseDate: new Date(expenseDate),
        createdById: user.id,
      },
    });
    revalidatePath("/admin/expenses");
  }

  async function addEmployeeExpense(formData: FormData) {
    "use server";
    await requireStaff("expenses.manage");
    const employeeId = String(formData.get("employeeId") ?? "");
    const branchId = String(formData.get("branchId") ?? "").trim();
    const type = String(formData.get("type") ?? "") as EmployeeExpenseType;
    const amount = Number(formData.get("amount"));
    const date = String(formData.get("date") ?? "");
    const notes = String(formData.get("notes") ?? "").trim();
    if (!employeeId || !EMPLOYEE_EXPENSE_TYPES.includes(type) || Number.isNaN(amount) || amount <= 0 || !date) return;
    if (user.role === "employee" && branchId && branchId !== user.branchId) return;

    await prisma.employeeExpense.create({
      data: {
        employeeId,
        branchId: branchId || null,
        type,
        amount,
        date: new Date(date),
        notes: notes || null,
        createdById: user.id,
      },
    });
    revalidatePath("/admin/expenses");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">{ep.title}</h1>

      <h2 className="mb-3 text-lg font-bold text-ink-900">{ep.generalExpenses}</h2>
      {canManage && (
        <form action={addExpense} className="mb-4 flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] bg-white p-4 shadow-[var(--shadow-soft)]">
          <div>
            <label className="mb-1 block text-xs text-ink-500">{ep.branch}</label>
            <select name="branchId" defaultValue="" className="rounded border border-ink-300 px-3 py-1.5 text-sm">
              <option value="">{ep.generalBranch}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">{ep.category}</label>
            <select name="category" required defaultValue="" className="rounded border border-ink-300 px-3 py-1.5 text-sm">
              <option value="" disabled>—</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">{ep.amount}</label>
            <input type="number" name="amount" min={0.01} step="0.01" required className="w-28 rounded border border-ink-300 px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">{ep.date}</label>
            <input type="date" name="expenseDate" required defaultValue={new Date().toISOString().slice(0, 10)} className="rounded border border-ink-300 px-3 py-1.5 text-sm" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="mb-1 block text-xs text-ink-500">{ep.description}</label>
            <input name="description" className="w-full rounded border border-ink-300 px-3 py-1.5 text-sm" />
          </div>
          <button type="submit" className="btn-press rounded-full bg-coral-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]">
            {ep.addExpense}
          </button>
        </form>
      )}
      <div className="mb-8 overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
        <div className="scroll-x-thin"><table className="w-full text-sm">
          <thead className="bg-blush-50 text-ink-700">
            <tr>
              <th className="p-3 text-start">{ep.date}</th>
              <th className="p-3 text-start">{ep.branch}</th>
              <th className="p-3 text-start">{ep.category}</th>
              <th className="p-3 text-start">{ep.description}</th>
              <th className="p-3 text-start">{ep.amount}</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                <td className="p-3 text-ink-700">{e.expenseDate.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}</td>
                <td className="p-3 text-ink-700">{e.branch?.name ?? ep.generalBranch}</td>
                <td className="p-3 text-ink-700">{categoryLabel(e.category)}</td>
                <td className="p-3 text-ink-700">{e.description ?? "—"}</td>
                <td className="p-3 font-medium text-ink-900">{Number(e.amount)} {dict.common.currency}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-blush-200 bg-blush-50 font-semibold">
              <td className="p-3 text-ink-900" colSpan={4}>{ep.totalGeneral}</td>
              <td className="p-3 text-ink-900">{totalGeneral} {dict.common.currency}</td>
            </tr>
          </tfoot>
        </table></div>
      </div>

      <h2 className="mb-3 text-lg font-bold text-ink-900">{ep.employeeExpenses}</h2>
      {canManage && (
        <form action={addEmployeeExpense} className="mb-4 flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] bg-white p-4 shadow-[var(--shadow-soft)]">
          <div>
            <label className="mb-1 block text-xs text-ink-500">{ep.employee}</label>
            <select name="employeeId" required defaultValue="" className="rounded border border-ink-300 px-3 py-1.5 text-sm">
              <option value="" disabled>—</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">{ep.branch}</label>
            <select name="branchId" defaultValue="" className="rounded border border-ink-300 px-3 py-1.5 text-sm">
              <option value="">{ep.generalBranch}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">{ep.type}</label>
            <select name="type" required defaultValue="" className="rounded border border-ink-300 px-3 py-1.5 text-sm">
              <option value="" disabled>—</option>
              {EMPLOYEE_EXPENSE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {typeLabel(t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">{ep.amount}</label>
            <input type="number" name="amount" min={0.01} step="0.01" required className="w-28 rounded border border-ink-300 px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">{ep.date}</label>
            <input type="date" name="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="rounded border border-ink-300 px-3 py-1.5 text-sm" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="mb-1 block text-xs text-ink-500">{ep.notes}</label>
            <input name="notes" className="w-full rounded border border-ink-300 px-3 py-1.5 text-sm" />
          </div>
          <button type="submit" className="btn-press rounded-full bg-coral-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]">
            {ep.addEmployeeExpense}
          </button>
        </form>
      )}
      <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
        <div className="scroll-x-thin"><table className="w-full text-sm">
          <thead className="bg-blush-50 text-ink-700">
            <tr>
              <th className="p-3 text-start">{ep.date}</th>
              <th className="p-3 text-start">{ep.employee}</th>
              <th className="p-3 text-start">{ep.branch}</th>
              <th className="p-3 text-start">{ep.type}</th>
              <th className="p-3 text-start">{ep.amount}</th>
            </tr>
          </thead>
          <tbody>
            {employeeExpenses.map((e) => (
              <tr key={e.id} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                <td className="p-3 text-ink-700">{e.date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}</td>
                <td className="p-3 text-ink-900">{e.employee.name}</td>
                <td className="p-3 text-ink-700">{e.branch?.name ?? ep.generalBranch}</td>
                <td className="p-3 text-ink-700">{typeLabel(e.type)}</td>
                <td className="p-3 font-medium text-ink-900">{Number(e.amount)} {dict.common.currency}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-blush-200 bg-blush-50 font-semibold">
              <td className="p-3 text-ink-900" colSpan={4}>{ep.totalEmployee}</td>
              <td className="p-3 text-ink-900">{totalEmployee} {dict.common.currency}</td>
            </tr>
          </tfoot>
        </table></div>
      </div>
    </div>
  );
}
