import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, dateLocaleFor } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { dict } = await getDictionary();
  return { title: dict.accountPage.title };
}

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/account");

  const { locale, dict } = await getDictionary();
  const ap = dict.accountPage;
  const dateLocale = dateLocaleFor(locale);

  const [user, orders] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.order.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  if (!user) redirect("/login");

  async function updateProfile(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s?.user) return;
    await prisma.user.update({
      where: { id: s.user.id },
      data: {
        name: String(formData.get("name") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        address: String(formData.get("address") ?? ""),
      },
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold text-ink-900">{ap.title}</h1>

      <div className="grid gap-10 md:grid-cols-2">
        <section>
          <h2 className="mb-4 font-bold text-ink-900">{ap.myDataTitle}</h2>
          <form action={updateProfile} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{ap.name}</label>
              <input name="name" defaultValue={user.name} className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{ap.phone}</label>
              <input name="phone" defaultValue={user.phone ?? ""} className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">{ap.address}</label>
              <textarea name="address" defaultValue={user.address ?? ""} rows={3} className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none" />
            </div>
            <button type="submit" className="btn-press rounded-full bg-coral-500 px-6 py-2.5 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]">
              {ap.save}
            </button>
          </form>
        </section>

        <section>
          <h2 className="mb-4 font-bold text-ink-900">{ap.myOrdersTitle}</h2>
          {orders.length === 0 ? (
            <p className="text-ink-500">{ap.noOrders}</p>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="flex items-center justify-between rounded-[var(--radius-sm)] bg-blush-50 px-4 py-3 hover:bg-blush-100"
                  >
                    <span className="text-sm text-ink-700">
                      #{order.id.slice(0, 8)} — {new Date(order.createdAt).toLocaleDateString(dateLocale)}
                    </span>
                    <span className="text-sm font-semibold text-ink-900">{dict.orderStatus[order.status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
