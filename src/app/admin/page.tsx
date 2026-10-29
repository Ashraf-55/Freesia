import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { hasPermission } from "@/lib/permissions";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await requireStaff();
  const { dict, locale } = await getDictionary();
  const d = dict.dashboardPage;

  const canSeeAllBranches = hasPermission(user.role, user.permissions, "reports.all_branches");
  const branchScope = user.role === "admin" || canSeeAllBranches ? {} : { branchId: user.branchId ?? "__none__" };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalProducts,
    pendingOrders,
    totalOrders,
    totalCustomers,
    revenueAgg,
    todayOnlineAgg,
    todayPosAgg,
    totalExpensesAgg,
    totalEmployeeExpensesAgg,
    branches,
    lowStockRows,
    recentOrders,
    recentPosSales,
    recentExpenses,
    recentTransfers,
  ] = await Promise.all([
    prisma.product.count({ where: { status: "active" } }),
    prisma.order.count({ where: { status: "pending" } }),
    prisma.order.count(),
    prisma.user.count({ where: { role: "customer" } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: "cancelled" } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: todayStart }, status: { not: "cancelled" } } }),
    prisma.posSale.aggregate({ _sum: { total: true }, where: { createdAt: { gte: todayStart }, status: "completed", ...branchScope } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: branchScope }),
    prisma.employeeExpense.aggregate({ _sum: { amount: true }, where: branchScope }),
    prisma.branch.findMany({ where: { status: "active", ...(user.role === "employee" ? { id: user.branchId ?? "__none__" } : {}) }, orderBy: { name: "asc" } }),
    prisma.inventory.findMany({
      where: { quantity: { gt: 0 }, ...(user.role === "employee" && !canSeeAllBranches ? { warehouse: { branchId: user.branchId ?? "__none__" } } : {}) },
      select: { productId: true, warehouseId: true, quantity: true, reorderLevel: true, product: { select: { name: true } }, warehouse: { select: { name: true } } },
      take: 300,
    }).then((rows) => rows.filter((r) => r.quantity <= Math.max(r.reorderLevel, 3)).slice(0, 8)),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.posSale.findMany({ where: branchScope, orderBy: { createdAt: "desc" }, take: 5, include: { branch: true } }),
    prisma.expense.findMany({ where: branchScope, orderBy: { expenseDate: "desc" }, take: 5, include: { branch: true } }),
    prisma.stockTransfer.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { fromWarehouse: true, toWarehouse: true } }),
  ]);

  const totalExpenses = Number(totalExpensesAgg._sum.amount ?? 0) + Number(totalEmployeeExpensesAgg._sum.amount ?? 0);

  // Branch performance: total POS sales per branch (respecting scope above).
  const branchSalesAgg = await prisma.posSale.groupBy({
    by: ["branchId"],
    where: { status: "completed", ...branchScope },
    _sum: { total: true },
  });
  const branchSalesById = new Map(branchSalesAgg.map((r) => [r.branchId, Number(r._sum.total ?? 0)]));

  const cards = [
    { label: d.activeProducts, value: totalProducts },
    { label: d.pendingOrders, value: pendingOrders },
    { label: d.totalOrders, value: totalOrders },
    { label: d.customers, value: totalCustomers },
    { label: d.totalRevenue, value: `${Number(revenueAgg._sum.total ?? 0)} ${dict.common.currency}` },
    { label: d.todayOnlineSales, value: `${Number(todayOnlineAgg._sum.total ?? 0)} ${dict.common.currency}` },
    { label: d.todayPosSales, value: `${Number(todayPosAgg._sum.total ?? 0)} ${dict.common.currency}` },
    { label: d.totalExpenses, value: `${totalExpenses} ${dict.common.currency}` },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-6 text-2xl font-bold text-ink-900">{d.title}</h1>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {cards.map((card, i) => (
            <div
              key={card.label}
              className="animate-fade-up rounded-[var(--radius-md)] bg-white p-5 shadow-[var(--shadow-soft)] transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <p className="text-sm text-ink-500">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-ink-900">{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-bold text-ink-900">{d.branchPerformance}</h2>
        <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
          <div className="scroll-x-thin"><table className="w-full text-sm">
            <thead className="bg-blush-50 text-ink-700">
              <tr>
                <th className="p-3 text-start">{d.branch}</th>
                <th className="p-3 text-start">{d.sales}</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                  <td className="p-3 text-ink-900">{b.name}</td>
                  <td className="p-3 text-ink-700">{branchSalesById.get(b.id) ?? 0} {dict.common.currency}</td>
                </tr>
              ))}
              {branches.length === 0 && (
                <tr><td colSpan={2} className="p-6 text-center text-ink-500">{d.noData}</td></tr>
              )}
            </tbody>
          </table></div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-bold text-ink-900">{d.lowStockProducts}</h2>
          <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
            <div className="scroll-x-thin"><table className="w-full text-sm">
              <tbody>
                {lowStockRows.map((r) => (
                  <tr key={`${r.productId}-${r.warehouseId}`} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                    <td className="p-3 text-ink-900">{r.product.name}</td>
                    <td className="p-3 text-ink-500">{r.warehouse.name}</td>
                    <td className="p-3 text-[var(--error)]">{r.quantity}</td>
                  </tr>
                ))}
                {lowStockRows.length === 0 && (
                  <tr><td className="p-6 text-center text-ink-500">{d.noData}</td></tr>
                )}
              </tbody>
            </table></div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-bold text-ink-900">{d.recentOrders}</h2>
          <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
            <div className="scroll-x-thin"><table className="w-full text-sm">
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                    <td className="p-3 text-ink-900">{o.customerName}</td>
                    <td className="p-3 text-ink-500">{dict.orderStatus[o.status] ?? o.status}</td>
                    <td className="p-3 text-ink-700">{Number(o.total)} {dict.common.currency}</td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr><td className="p-6 text-center text-ink-500">{d.noData}</td></tr>
                )}
              </tbody>
            </table></div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-bold text-ink-900">{d.recentPosSales}</h2>
          <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
            <div className="scroll-x-thin"><table className="w-full text-sm">
              <tbody>
                {recentPosSales.map((s) => (
                  <tr key={s.id} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                    <td className="p-3 text-ink-900">{s.branch.name}</td>
                    <td className="p-3 text-ink-700">{Number(s.total)} {dict.common.currency}</td>
                  </tr>
                ))}
                {recentPosSales.length === 0 && (
                  <tr><td className="p-6 text-center text-ink-500">{d.noData}</td></tr>
                )}
              </tbody>
            </table></div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-bold text-ink-900">{d.recentExpenses}</h2>
          <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
            <div className="scroll-x-thin"><table className="w-full text-sm">
              <tbody>
                {recentExpenses.map((e) => (
                  <tr key={e.id} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                    <td className="p-3 text-ink-900">{e.branch?.name ?? "—"}</td>
                    <td className="p-3 text-ink-500">{e.category}</td>
                    <td className="p-3 text-ink-700">{Number(e.amount)} {dict.common.currency}</td>
                  </tr>
                ))}
                {recentExpenses.length === 0 && (
                  <tr><td className="p-6 text-center text-ink-500">{d.noData}</td></tr>
                )}
              </tbody>
            </table></div>
          </div>
        </section>
      </div>

      <section>
        <h2 className="mb-3 font-bold text-ink-900">{d.recentTransfers}</h2>
        <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
          <div className="scroll-x-thin"><table className="w-full text-sm">
            <tbody>
              {recentTransfers.map((t) => (
                <tr key={t.id} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                  <td className="p-3 text-ink-700">{t.createdAt.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}</td>
                  <td className="p-3 text-ink-900">{t.fromWarehouse.name} → {t.toWarehouse.name}</td>
                  <td className="p-3 text-ink-500">{t.status}</td>
                </tr>
              ))}
              {recentTransfers.length === 0 && (
                <tr><td colSpan={3} className="p-6 text-center text-ink-500">{d.noData}</td></tr>
              )}
            </tbody>
          </table></div>
        </div>
      </section>
    </div>
  );
}
