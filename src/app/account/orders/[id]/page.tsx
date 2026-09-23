import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, dateLocaleFor } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AccountOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const { locale, dict } = await getDictionary();
  const od = dict.orderDetailPage;
  const order = await prisma.order.findFirst({
    where: { id, userId: session.user.id },
    include: { items: true },
  });
  if (!order) notFound();

  return (
    <div className="animate-fade-up mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-1 text-2xl font-bold text-ink-900">{od.title(order.id.slice(0, 8))}</h1>
      <p className="mb-8 text-sm text-ink-500">
        {new Date(order.createdAt).toLocaleDateString(dateLocaleFor(locale))} — {dict.orderStatus[order.status]}
      </p>

      <div className="rounded-[var(--radius-md)] bg-blush-50 p-6">
        <ul className="space-y-2 text-sm text-ink-700">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">{item.nameSnapshot} × {item.qty}</span>
              <span className="shrink-0">{Number(item.priceSnapshot) * item.qty} {dict.common.currency}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-ink-300/30 pt-4 text-sm">
          <div className="flex justify-between text-ink-700">
            <span>{od.subtotal}</span>
            <span>{Number(order.subtotal)} {dict.common.currency}</span>
          </div>
          <div className="flex justify-between text-ink-700">
            <span>{od.deliveryFee}</span>
            <span>{Number(order.deliveryFee)} {dict.common.currency}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-ink-900">
            <span>{od.total}</span>
            <span>{Number(order.total)} {dict.common.currency}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[var(--radius-md)] bg-white p-6 shadow-[var(--shadow-soft)] text-sm text-ink-700 transition-shadow hover:shadow-[var(--shadow-lift)]">
        <p className="break-words"><strong>{od.address}:</strong> {order.address}</p>
        <p><strong>{od.phone}:</strong> {order.phone}</p>
        {order.notes && <p className="break-words"><strong>{od.notes}:</strong> {order.notes}</p>}
      </div>
    </div>
  );
}
