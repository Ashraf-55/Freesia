import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { getDictionary } from "@/lib/i18n";
import TransferForm from "@/components/admin/transfer-form";

export const dynamic = "force-dynamic";

export default async function AdminTransfersPage() {
  const user = await requireStaff("inventory.transfer");
  const { locale, dict } = await getDictionary();
  const tp = dict.adminTransfersPage;

  const warehousesQuery =
    user.role === "employee"
      ? { status: "active" as const, branchId: user.branchId ?? "__none__" }
      : { status: "active" as const };

  const transferHistoryQuery =
    user.role === "employee"
      ? {
          OR: [
            { fromWarehouse: { branchId: user.branchId ?? "__none__" } },
            { toWarehouse: { branchId: user.branchId ?? "__none__" } },
          ],
        }
      : {};

  const [warehouses, products, transfers] = await Promise.all([
    prisma.warehouse.findMany({ where: warehousesQuery, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { status: "active" }, select: { id: true, name: true, nameEn: true }, orderBy: { name: "asc" } }),
    prisma.stockTransfer.findMany({
      where: transferHistoryQuery,
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { fromWarehouse: true, toWarehouse: true, createdBy: true, items: { include: { product: true } } },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">{tp.title}</h1>

      {warehouses.length < 2 ? (
        <p className="mb-8 rounded-[var(--radius-md)] bg-white p-4 text-sm text-ink-500 shadow-[var(--shadow-soft)]">
          {tp.needTwoWarehouses}
        </p>
      ) : (
        <TransferForm
          warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
          products={products.map((p) => ({ id: p.id, name: locale === "en" && p.nameEn ? p.nameEn : p.name }))}
        />
      )}

      <h2 className="mb-3 mt-8 text-lg font-bold text-ink-900">{tp.history}</h2>
      <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
        <div className="scroll-x-thin"><table className="w-full text-sm">
          <thead className="bg-blush-50 text-ink-700">
            <tr>
              <th className="p-3 text-start">{tp.date}</th>
              <th className="p-3 text-start">{tp.from}</th>
              <th className="p-3 text-start">{tp.to}</th>
              <th className="p-3 text-start">{tp.product}</th>
              <th className="p-3 text-start">{tp.status}</th>
              <th className="p-3 text-start">{tp.by}</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id} className="border-t border-blush-100 align-top">
                <td className="p-3 whitespace-nowrap text-ink-700">
                  {t.createdAt.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")}
                </td>
                <td className="p-3 text-ink-900">{t.fromWarehouse.name}</td>
                <td className="p-3 text-ink-900">{t.toWarehouse.name}</td>
                <td className="p-3 text-ink-700">
                  {t.items.map((i) => (
                    <div key={i.id}>
                      {i.product.name} × {i.quantity}
                    </div>
                  ))}
                </td>
                <td className="p-3 text-ink-700">{t.status}</td>
                <td className="p-3 text-ink-700">{t.createdBy.name}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        {transfers.length === 0 && <p className="p-6 text-center text-sm text-ink-500">{tp.empty}</p>}
      </div>
    </div>
  );
}
