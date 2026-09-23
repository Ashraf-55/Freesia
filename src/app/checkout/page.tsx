"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClientDictionary } from "@/lib/i18n/use-locale";

type CartItem = {
  id: string;
  qty: number;
  product: { name: string; nameEn: string | null; price: string; discountPrice: string | null };
};

const DELIVERY_FEE = 50;

export default function CheckoutPage() {
  const router = useRouter();
  const { locale, dict } = useClientDictionary();
  const c = dict.checkoutPage;
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/cart")
      .then((r) => r.json())
      .then((d) => setItems(d.items));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      address: form.get("address"),
      notes: form.get("notes"),
    };
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? c.genericError);
      setLoading(false);
      return;
    }
    router.push(`/order-confirmation/${data.orderId}`);
  }

  if (!items) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="skeleton mb-8 h-8 w-40 rounded-[var(--radius-sm)]" />
        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-11 w-full rounded-[var(--radius-sm)]" />
            ))}
          </div>
          <div className="skeleton h-56 w-full rounded-[var(--radius-md)]" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="animate-fade-up mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="mb-2 text-2xl font-bold text-ink-900">{c.emptyTitle}</h1>
        <p className="text-ink-500">{c.emptyBody}</p>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + Number(item.product.discountPrice ?? item.product.price) * item.qty, 0);
  const total = subtotal + DELIVERY_FEE;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="animate-fade-up mb-8 text-2xl font-bold text-ink-900">{c.title}</h1>
      <div className="grid gap-10 md:grid-cols-2">
        <form onSubmit={onSubmit} className="animate-fade-up space-y-4" style={{ animationDelay: "80ms" }}>
          {error && <p className="animate-fade-in rounded-md bg-red-50 px-4 py-2 text-sm text-[var(--error)]">{error}</p>}
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">{c.name}</label>
            <input name="name" required className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2.5 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">{c.email}</label>
            <input type="email" name="email" required className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2.5 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">{c.phone}</label>
            <input name="phone" required className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2.5 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">{c.address}</label>
            <textarea name="address" required rows={3} className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2.5 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">{c.notes}</label>
            <textarea name="notes" rows={2} className="w-full rounded-[var(--radius-sm)] border border-ink-300 px-4 py-2.5 transition-all duration-300 focus:border-coral-500 focus:shadow-[var(--shadow-soft)] focus:outline-none" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-press w-full rounded-full bg-coral-500 py-3 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)] disabled:opacity-60"
          >
            {loading ? c.placing : c.placeOrder}
          </button>
        </form>

        <div className="animate-fade-up h-fit rounded-[var(--radius-md)] bg-blush-50 p-6" style={{ animationDelay: "160ms" }}>
          <h2 className="mb-4 font-bold text-ink-900">{c.orderSummary}</h2>
          <ul className="space-y-2 text-sm text-ink-700">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-2">
                <span className="min-w-0 truncate">{locale === "en" && item.product.nameEn ? item.product.nameEn : item.product.name} × {item.qty}</span>
                <span className="shrink-0">{Number(item.product.discountPrice ?? item.product.price) * item.qty} {dict.common.currency}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-ink-300/30 pt-4 text-sm">
            <div className="flex justify-between text-ink-700">
              <span>{c.subtotal}</span>
              <span>{subtotal} {dict.common.currency}</span>
            </div>
            <div className="flex justify-between text-ink-700">
              <span>{c.deliveryFee}</span>
              <span>{DELIVERY_FEE} {dict.common.currency}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-ink-900">
              <span>{c.total}</span>
              <span>{total} {dict.common.currency}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
