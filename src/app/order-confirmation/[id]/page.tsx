import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { dict } = await getDictionary();
  const oc = dict.orderConfirmationPage;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) notFound();

  return (
    <div className="animate-fade-up mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="animate-pop-badge mb-4 text-5xl"><span className="inline-block animate-float">🌸</span></div>
      <h1 className="animate-fade-up mb-2 text-2xl font-bold text-ink-900" style={{ animationDelay: "100ms" }}>{oc.title}</h1>
      <p className="animate-fade-up mb-8 text-ink-500" style={{ animationDelay: "160ms" }}>{oc.subtitle}</p>

      <div className="animate-fade-up rounded-[var(--radius-md)] bg-blush-50 p-6 text-start shadow-[var(--shadow-soft)]" style={{ animationDelay: "220ms" }}>
        <p className="mb-2 break-all text-sm text-ink-500">{oc.orderNumber}: {order.id}</p>
        <ul className="space-y-2 text-sm text-ink-700">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">{item.nameSnapshot} × {item.qty}</span>
              <span className="shrink-0">{Number(item.priceSnapshot) * item.qty} {dict.common.currency}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-ink-300/30 pt-4 text-lg font-bold text-ink-900">
          <span>{oc.total}</span>
          <span>{Number(order.total)} {dict.common.currency}</span>
        </div>
      </div>

      <Link
        href="/"
        className="btn-press animate-fade-up mt-8 inline-block rounded-full bg-coral-500 px-8 py-3 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]"
        style={{ animationDelay: "280ms" }}
      >
        {oc.backHome}
      </Link>
    </div>
  );
}
