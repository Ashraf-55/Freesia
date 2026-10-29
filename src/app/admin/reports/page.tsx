import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { hasPermission } from "@/lib/permissions";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; branchId?: string }>;
}) {
  const user = await requireStaff("reports.view");
  const { dict, locale } = await getDictionary();
  const rp = dict.adminReportsPage;

  const canSeeAllBranches = hasPermission(user.role, user.permissions, "reports.all_branches");
  const { from, to, branchId: branchIdParam } = await searchParams;

  // An employee without reports.all_branches only ever sees their own
  // branch's numbers (spec §12/§15) — the filter is not just a UI
  // dropdown, it's enforced here regardless of what's in the URL.
  const effectiveBranchId = canSeeAllBranches ? branchIdParam || null : user.branchId ?? "__none__";

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    dateFilter.lte = toDate;
  }
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });

  // ── Online sales (store-wide — orders aren't tied to one branch) ──────
  const orderWhere = hasDateFilter ? { createdAt: dateFilter } : {};
  const [salesByStatus, orderItems] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], where: orderWhere, _count: { _all: true }, _sum: { total: true } }),
    prisma.orderItem.findMany({
      where: hasDateFilter ? { order: { createdAt: dateFilter } } : {},
      select: { nameSnapshot: true, qty: true, priceSnapshot: true },
    }),
  ]);
  const topProductsMap = new Map<string, { qty: number; revenue: number }>();
  for (const item of orderItems) {
    const entry = topProductsMap.get(item.nameSnapshot) ?? { qty: 0, revenue: 0 };
    entry.qty += item.qty;
    entry.revenue += item.qty * Number(item.priceSnapshot);
    topProductsMap.set(item.nameSnapshot, entry);
  }
  const topProducts = [...topProductsMap.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);
  const onlineSalesTotal = salesByStatus
    .filter((s) => s.status !== "cancelled")
    .reduce((sum, s) => sum + Number(s._sum.total ?? 0), 0);

  // ── Branch (POS) sales ─────────────────────────────────────────────────
  const posWhere = {
    ...(hasDateFilter ? { createdAt: dateFilter } : {}),
    ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    status: "completed" as const,
  };
  const [posByBranch, posByEmployee, posSalesForTotal] = await Promise.all([
    prisma.posSale.groupBy({ by: ["branchId"], where: posWhere, _count: { _all: true }, _sum: { total: true } }),
    prisma.posSale.groupBy({ by: ["cashierId"], where: posWhere, _count: { _all: true }, _sum: { total: true } }),
    prisma.posSale.findMany({ where: posWhere, select: { total: true } }),
  ]);
  const branchNameById = new Map(branches.map((b) => [b.id, b.name]));
  const posSalesTotal = posSalesForTotal.reduce((sum, s) => sum + Number(s.total), 0);
  const employeeIds = posByEmployee.map((r) => r.cashierId);
  const employees = employeeIds.length
    ? await prisma.user.findMany({ where: { id: { in: employeeIds } }, select: { id: true, name: true } })
    : [];
  const employeeNameById = new Map(employees.map((e) => [e.id, e.name]));

  // ── Inventory report ─────────────────────────────────────────────────
  const warehouseWhere = effectiveBranchId ? { branchId: effectiveBranchId } : {};
  const warehouses = await prisma.warehouse.findMany({ where: warehouseWhere, select: { id: true, name: true } });
  const warehouseIds = warehouses.map((w) => w.id);
  const warehouseNameById = new Map(warehouses.map((w) => [w.id, w.name]));

  const [lowStockRows, outOfStockCount, recentMovements, recentTransfers] = await Promise.all([
    prisma.inventory
      .findMany({
        where: { warehouseId: { in: warehouseIds }, quantity: { gt: 0 } },
        select: { productId: true, warehouseId: true, quantity: true, reorderLevel: true },
        take: 500,
      })
      .then((rows) => rows.filter((r) => r.quantity <= Math.max(r.reorderLevel, 3))),
    prisma.inventory.count({ where: { warehouseId: { in: warehouseIds }, quantity: 0 } }),
    prisma.inventoryMovement.findMany({
      where: { warehouseId: { in: warehouseIds }, ...(hasDateFilter ? { createdAt: dateFilter } : {}) },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { product: true, warehouse: true },
    }),
    prisma.stockTransfer.findMany({
      where: {
        OR: [{ fromWarehouseId: { in: warehouseIds } }, { toWarehouseId: { in: warehouseIds } }],
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { fromWarehouse: true, toWarehouse: true },
    }),
  ]);
  const lowStockProductIds = [...new Set(lowStockRows.map((r) => r.productId))];
  const lowStockProducts = lowStockProductIds.length
    ? await prisma.product.findMany({ where: { id: { in: lowStockProductIds } }, select: { id: true, name: true } })
    : [];
  const productNameById = new Map(lowStockProducts.map((p) => [p.id, p.name]));

  // ── Expense report ───────────────────────────────────────────────────
  const expenseWhere = {
    ...(hasDateFilter ? { expenseDate: dateFilter } : {}),
    ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
  };
  const employeeExpenseWhere = {
    ...(hasDateFilter ? { date: dateFilter } : {}),
    ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
  };
  const [expensesByCategory, expensesByBranch, employeeExpensesSum] = await Promise.all([
    prisma.expense.groupBy({ by: ["category"], where: expenseWhere, _sum: { amount: true } }),
    prisma.expense.groupBy({ by: ["branchId"], where: expenseWhere, _sum: { amount: true } }),
    prisma.employeeExpense.aggregate({ where: employeeExpenseWhere, _sum: { amount: true } }),
  ]);
  const totalGeneralExpenses = expensesByCategory.reduce((sum, e) => sum + Number(e._sum.amount ?? 0), 0);
  const totalEmployeeExpenses = Number(employeeExpensesSum._sum.amount ?? 0);
  const totalExpenses = totalGeneralExpenses + totalEmployeeExpenses;

  const totalSales = onlineSalesTotal + posSalesTotal;
  const estimatedNetProfit = totalSales - totalExpenses;

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-ink-900">{rp.title}</h1>

      <form className="flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] bg-white p-4 shadow-[var(--shadow-soft)]">
        <div>
          <label className="mb-1 block text-xs text-ink-500">{rp.filterFrom}</label>
          <input type="date" name="from" defaultValue={from ?? ""} className="rounded border border-ink-300 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-500">{rp.filterTo}</label>
          <input type="date" name="to" defaultValue={to ?? ""} className="rounded border border-ink-300 px-3 py-1.5 text-sm" />
        </div>
        {canSeeAllBranches && (
          <div>
            <label className="mb-1 block text-xs text-ink-500">{rp.filterBranch}</label>
            <select name="branchId" defaultValue={branchIdParam ?? ""} className="rounded border border-ink-300 px-3 py-1.5 text-sm">
              <option value="">{rp.allBranches}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
        <button type="submit" className="btn-press rounded-full bg-coral-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]">
          {rp.apply}
        </button>
      </form>

      <section>
        <h2 className="mb-3 font-bold text-ink-900">{rp.profitSummary}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[var(--radius-md)] bg-white p-4 shadow-[var(--shadow-soft)]">
            <p className="text-xs text-ink-500">{rp.totalSales}</p>
            <p className="text-xl font-bold text-ink-900">{totalSales} {dict.common.currency}</p>
          </div>
          <div className="rounded-[var(--radius-md)] bg-white p-4 shadow-[var(--shadow-soft)]">
            <p className="text-xs text-ink-500">{rp.totalExpenses}</p>
            <p className="text-xl font-bold text-ink-900">{totalExpenses} {dict.common.currency}</p>
          </div>
          <div className="rounded-[var(--radius-md)] bg-blush-50 p-4">
            <p className="text-xs text-ink-500">{rp.estimatedNetProfit}</p>
            <p className={`text-xl font-bold ${estimatedNetProfit >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
              {estimatedNetProfit} {dict.common.currency}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-500">{rp.profitNote}</p>
      </section>

      <section>
        <h2 className="mb-3 font-bold text-ink-900">{rp.onlineSales}</h2>
        <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
          <div className="scroll-x-thin"><table className="w-full text-sm">
            <thead className="bg-blush-50 text-ink-700">
              <tr>
                <th className="p-3 text-start">{rp.status}</th>
                <th className="p-3 text-start">{rp.ordersCount}</th>
                <th className="p-3 text-start">{rp.total}</th>
              </tr>
            </thead>
            <tbody>
              {salesByStatus.map((row) => (
                <tr key={row.status} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                  <td className="p-3 text-ink-900">{dict.orderStatus[row.status] ?? row.status}</td>
                  <td className="p-3 text-ink-700">{row._count._all}</td>
                  <td className="p-3 text-ink-700">{Number(row._sum.total ?? 0)} {dict.common.currency}</td>
                </tr>
              ))}
              {salesByStatus.length === 0 && (
                <tr><td colSpan={3} className="p-6 text-center text-ink-500">{rp.noData}</td></tr>
              )}
            </tbody>
          </table></div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold text-ink-900">{rp.topProducts}</h2>
        <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
          <div className="scroll-x-thin"><table className="w-full text-sm">
            <thead className="bg-blush-50 text-ink-700">
              <tr>
                <th className="p-3 text-start">{rp.product}</th>
                <th className="p-3 text-start">{rp.qtySold}</th>
                <th className="p-3 text-start">{rp.revenue}</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map(([name, data]) => (
                <tr key={name} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                  <td className="p-3 text-ink-900">{name}</td>
                  <td className="p-3 text-ink-700">{data.qty}</td>
                  <td className="p-3 text-ink-700">{data.revenue} {dict.common.currency}</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr><td colSpan={3} className="p-6 text-center text-ink-500">{rp.noData}</td></tr>
              )}
            </tbody>
          </table></div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold text-ink-900">{rp.branchSales}</h2>
        <div className="mb-4 overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
          <div className="scroll-x-thin"><table className="w-full text-sm">
            <thead className="bg-blush-50 text-ink-700">
              <tr>
                <th className="p-3 text-start">{rp.branch}</th>
                <th className="p-3 text-start">{rp.posSalesCount}</th>
                <th className="p-3 text-start">{rp.posSalesTotal}</th>
              </tr>
            </thead>
            <tbody>
              {posByBranch.map((row) => (
                <tr key={row.branchId} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                  <td className="p-3 text-ink-900">{branchNameById.get(row.branchId) ?? "—"}</td>
                  <td className="p-3 text-ink-700">{row._count._all}</td>
                  <td className="p-3 text-ink-700">{Number(row._sum.total ?? 0)} {dict.common.currency}</td>
                </tr>
              ))}
              {posByBranch.length === 0 && (
                <tr><td colSpan={3} className="p-6 text-center text-ink-500">{rp.noData}</td></tr>
              )}
            </tbody>
          </table></div>
        </div>

        <h3 className="mb-2 text-sm font-bold text-ink-700">{rp.employeeSales}</h3>
        <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
          <div className="scroll-x-thin"><table className="w-full text-sm">
            <thead className="bg-blush-50 text-ink-700">
              <tr>
                <th className="p-3 text-start">{rp.employee}</th>
                <th className="p-3 text-start">{rp.posSalesCount}</th>
                <th className="p-3 text-start">{rp.posSalesTotal}</th>
              </tr>
            </thead>
            <tbody>
              {posByEmployee.map((row) => (
                <tr key={row.cashierId} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                  <td className="p-3 text-ink-900">{employeeNameById.get(row.cashierId) ?? "—"}</td>
                  <td className="p-3 text-ink-700">{row._count._all}</td>
                  <td className="p-3 text-ink-700">{Number(row._sum.total ?? 0)} {dict.common.currency}</td>
                </tr>
              ))}
              {posByEmployee.length === 0 && (
                <tr><td colSpan={3} className="p-6 text-center text-ink-500">{rp.noData}</td></tr>
              )}
            </tbody>
          </table></div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold text-ink-900">{rp.inventoryReport}</h2>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
            <div className="border-b border-blush-100 p-3 text-sm font-bold text-ink-700">{rp.lowStock}</div>
            <div className="scroll-x-thin"><table className="w-full text-sm">
              <tbody>
                {lowStockRows.slice(0, 20).map((r) => (
                  <tr key={`${r.productId}-${r.warehouseId}`} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                    <td className="p-3 text-ink-900">{productNameById.get(r.productId) ?? r.productId}</td>
                    <td className="p-3 text-ink-500">{warehouseNameById.get(r.warehouseId) ?? "—"}</td>
                    <td className="p-3 text-[var(--error)]">{r.quantity}</td>
                  </tr>
                ))}
                {lowStockRows.length === 0 && (
                  <tr><td className="p-6 text-center text-ink-500">{rp.noData}</td></tr>
                )}
              </tbody>
            </table></div>
          </div>
          <div className="rounded-[var(--radius-md)] bg-white p-4 shadow-[var(--shadow-soft)]">
            <p className="text-xs text-ink-500">{rp.outOfStock}</p>
            <p className="text-2xl font-bold text-[var(--error)]">{outOfStockCount}</p>
          </div>
        </div>

        <h3 className="mb-2 text-sm font-bold text-ink-700">{rp.recentMovements}</h3>
        <div className="mb-4 overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
          <div className="scroll-x-thin"><table className="w-full text-sm">
            <thead className="bg-blush-50 text-ink-700">
              <tr>
                <th className="p-3 text-start">{rp.product}</th>
                <th className="p-3 text-start">{rp.warehouse}</th>
                <th className="p-3 text-start">{rp.movementType}</th>
                <th className="p-3 text-start">{rp.quantity}</th>
              </tr>
            </thead>
            <tbody>
              {recentMovements.map((m) => (
                <tr key={m.id} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                  <td className="p-3 text-ink-900">{m.product.name}</td>
                  <td className="p-3 text-ink-500">{m.warehouse.name}</td>
                  <td className="p-3 text-ink-700">{m.movementType}</td>
                  <td className={`p-3 font-medium ${m.quantityChange >= 0 ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                    {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                  </td>
                </tr>
              ))}
              {recentMovements.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-ink-500">{rp.noData}</td></tr>
              )}
            </tbody>
          </table></div>
        </div>

        <h3 className="mb-2 text-sm font-bold text-ink-700">{rp.recentTransfers}</h3>
        <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
          <div className="scroll-x-thin"><table className="w-full text-sm">
            <tbody>
              {recentTransfers.map((t) => (
                <tr key={t.id} className="border-t border-blush-100 text-sm">
                  <td className="p-3 text-ink-700">{t.createdAt.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}</td>
                  <td className="p-3 text-ink-900">{t.fromWarehouse.name} → {t.toWarehouse.name}</td>
                  <td className="p-3 text-ink-500">{t.status}</td>
                </tr>
              ))}
              {recentTransfers.length === 0 && (
                <tr><td className="p-6 text-center text-ink-500">{rp.noData}</td></tr>
              )}
            </tbody>
          </table></div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold text-ink-900">{rp.expenseReport}</h2>
        <div className="mb-4 rounded-[var(--radius-md)] bg-white p-4 shadow-[var(--shadow-soft)]">
          <p className="text-xs text-ink-500">{rp.totalExpenses}</p>
          <p className="text-xl font-bold text-ink-900">{totalExpenses} {dict.common.currency}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
            <div className="border-b border-blush-100 p-3 text-sm font-bold text-ink-700">{rp.expensesByCategory}</div>
            <div className="scroll-x-thin"><table className="w-full text-sm">
              <tbody>
                {expensesByCategory.map((e) => (
                  <tr key={e.category} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                    <td className="p-3 text-ink-900">{e.category}</td>
                    <td className="p-3 text-ink-700">{Number(e._sum.amount ?? 0)} {dict.common.currency}</td>
                  </tr>
                ))}
                {expensesByCategory.length === 0 && (
                  <tr><td className="p-6 text-center text-ink-500">{rp.noData}</td></tr>
                )}
              </tbody>
            </table></div>
          </div>
          <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
            <div className="border-b border-blush-100 p-3 text-sm font-bold text-ink-700">{rp.expensesByBranch}</div>
            <div className="scroll-x-thin"><table className="w-full text-sm">
              <tbody>
                {expensesByBranch.map((e) => (
                  <tr key={e.branchId ?? "general"} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                    <td className="p-3 text-ink-900">{e.branchId ? branchNameById.get(e.branchId) ?? "—" : rp.allBranches}</td>
                    <td className="p-3 text-ink-700">{Number(e._sum.amount ?? 0)} {dict.common.currency}</td>
                  </tr>
                ))}
                {expensesByBranch.length === 0 && (
                  <tr><td className="p-6 text-center text-ink-500">{rp.noData}</td></tr>
                )}
              </tbody>
            </table></div>
          </div>
        </div>
      </section>
    </div>
  );
}
