import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-staff";
import { getDictionary, dateLocaleFor } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireStaff("orders.view");
  const { status } = await searchParams;
  const { locale, dict } = await getDictionary();
  const op = dict.adminOrdersPage;
  const dateLocale = dateLocaleFor(locale);

  const orders = await prisma.order.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink-900">{op.title}</h1>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/orders" className={`rounded-full px-3 py-1 ${!status ? "bg-coral-500 text-white" : "bg-blush-50 text-ink-700"}`}>
          {op.all}
        </Link>
        {Object.entries(dict.orderStatus).map(([key, label]) => (
          <Link key={key} href={`/admin/orders?status=${key}`} className={`rounded-full px-3 py-1 ${status === key ? "bg-coral-500 text-white" : "bg-blush-50 text-ink-700"}`}>
            {label}
          </Link>
        ))}
      </div>

      <div className="animate-fade-up overflow-hidden rounded-[var(--radius-md)] bg-white shadow-[var(--shadow-soft)]">
        <div className="scroll-x-thin"><table className="w-full text-sm">
          <thead className="bg-blush-50 text-ink-700">
            <tr>
              <th className="p-3 text-start">{op.orderNumber}</th>
              <th className="p-3 text-start">{op.customer}</th>
              <th className="p-3 text-start">{op.date}</th>
              <th className="p-3 text-start">{op.total}</th>
              <th className="p-3 text-start">{op.status}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-blush-100 transition-colors hover:bg-blush-50/60">
                <td className="p-3 font-mono text-xs text-ink-700">#{o.id.slice(0, 8)}</td>
                <td className="p-3 text-ink-900">{o.customerName}</td>
                <td className="p-3 text-ink-700">{new Date(o.createdAt).toLocaleDateString(dateLocale)}</td>
                <td className="p-3 text-ink-700">{Number(o.total)} {dict.common.currency}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${STATUS_COLORS[o.status]}`}>{dict.orderStatus[o.status]}</span>
                </td>
                <td className="p-3 text-end">
                  <Link href={`/admin/orders/${o.id}`} className="text-coral-600 hover:underline">
                    {op.details}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
