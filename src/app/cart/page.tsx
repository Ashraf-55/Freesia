"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useClientDictionary } from "@/lib/i18n/use-locale";
import { useToast } from "@/components/toast-provider";

type CartItem = {
  id: string;
  qty: number;
  product: {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    price: string;
    discountPrice: string | null;
    images: { filename: string }[];
  };
};

export default function CartPage() {
  const { locale, dict } = useClientDictionary();
  const cp = dict.cartPage;
  const showToast = useToast();
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/cart");
      if (!res.ok) {
        setLoadFailed(true);
        return;
      }
      const data = await res.json();
      setItems(data.items);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateQty(itemId: string, qty: number) {
    setBusy(itemId);
    setError(null);
    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, qty }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? cp.genericError);
        return; // don't silently pretend the update happened
      }
      await load();
      window.dispatchEvent(new CustomEvent("freesia:cart-changed"));
    } catch {
      setError(cp.genericError);
    } finally {
      setBusy(null);
    }
  }

  async function removeItem(itemId: string) {
    setBusy(itemId);
    setError(null);
    setRemovingId(itemId);
    try {
      const res = await fetch(`/api/cart?itemId=${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? cp.genericError);
        setRemovingId(null);
        return;
      }
      // Let the fade/slide-out play before the row actually disappears
      // from the list, instead of the item vanishing instantly.
      await new Promise((resolve) => setTimeout(resolve, 260));
      await load();
      window.dispatchEvent(new CustomEvent("freesia:cart-changed"));
      showToast(cp.remove, "info");
    } catch {
      setError(cp.genericError);
    } finally {
      setBusy(null);
      setRemovingId(null);
    }
  }

  if (loadFailed) {
    return (
      <div className="animate-fade-up mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="mb-4 text-[var(--error)]">{cp.loadError}</p>
        <button
          onClick={() => {
            setLoadFailed(false);
            load();
          }}
          className="btn-press rounded-full bg-coral-500 px-6 py-2.5 font-semibold text-white hover:bg-coral-600"
        >
          {dict.common.loading}
        </button>
      </div>
    );
  }

  if (!items) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="skeleton mb-6 h-8 w-40 rounded-[var(--radius-sm)]" />
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-[var(--radius-md)] bg-white p-4 shadow-[var(--shadow-soft)]">
              <div className="skeleton h-20 w-20 shrink-0 rounded-[var(--radius-sm)]" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-1/2 rounded" />
                <div className="skeleton h-3 w-1/4 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="animate-fade-up mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="mb-2 text-2xl font-bold text-ink-900">{cp.emptyTitle}</h1>
        <p className="mb-6 text-ink-500">{cp.emptySubtitle}</p>
        <Link href="/" className="btn-press inline-block rounded-full bg-coral-500 px-6 py-2.5 font-semibold text-white hover:bg-coral-600">
          {cp.browseProducts}
        </Link>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.product.discountPrice ?? item.product.price);
    return sum + price * item.qty;
  }, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="animate-fade-up mb-6 text-2xl font-bold text-ink-900">{cp.title}</h1>

      {error && (
        <p className="animate-fade-in mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-[var(--error)]">{error}</p>
      )}

      <div className="space-y-4">
        {items.map((item, i) => {
          const price = Number(item.product.discountPrice ?? item.product.price);
          const leaving = removingId === item.id;
          return (
            <div
              key={item.id}
              className={`animate-fade-up flex flex-wrap items-center gap-4 rounded-[var(--radius-md)] bg-white p-4 shadow-[var(--shadow-soft)] transition-all duration-300 ${
                leaving ? "scale-[0.98] opacity-0" : "opacity-100"
              }`}
              style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
            >
              <div className="media-frame relative h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)]">
                {item.product.images[0] && (
                  <Image src={`/images/${item.product.images[0].filename}`} alt={locale === "en" && item.product.nameEn ? item.product.nameEn : item.product.name} fill sizes="80px" className="object-contain p-1.5" />
                )}
              </div>
              <div className="min-w-[140px] flex-1">
                <Link href={`/product/${item.product.slug}`} className="font-semibold text-ink-900 transition-colors hover:text-coral-600">
                  {locale === "en" && item.product.nameEn ? item.product.nameEn : item.product.name}
                </Link>
                <div className="mt-1 text-sm text-ink-500">{price} {dict.common.currency}</div>
              </div>

              <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-5">
                <div className="flex items-center gap-2">
                  <button
                    disabled={busy === item.id}
                    onClick={() => updateQty(item.id, item.qty - 1)}
                    className="btn-press flex h-9 w-9 items-center justify-center rounded-full border border-ink-300 text-ink-700 transition-colors hover:border-coral-400 hover:text-coral-600 disabled:opacity-50"
                  >
                    −
                  </button>
                  <span className="w-6 text-center transition-all">{item.qty}</span>
                  <button
                    disabled={busy === item.id}
                    onClick={() => updateQty(item.id, item.qty + 1)}
                    className="btn-press flex h-9 w-9 items-center justify-center rounded-full border border-ink-300 text-ink-700 transition-colors hover:border-coral-400 hover:text-coral-600 disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
                <div className="w-20 text-end font-semibold text-ink-900">{price * item.qty} {dict.common.currency}</div>
                <button
                  disabled={busy === item.id}
                  onClick={() => removeItem(item.id)}
                  className="btn-press text-sm text-[var(--error)] transition hover:underline disabled:opacity-50"
                >
                  {cp.remove}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="animate-fade-up mt-8 flex items-center justify-between rounded-[var(--radius-md)] bg-blush-50 p-6">
        <span className="text-lg font-semibold text-ink-900">{cp.subtotal}</span>
        <span className="text-xl font-bold text-ink-900">{subtotal} {dict.common.currency}</span>
      </div>

      <Link
        href="/checkout"
        className="btn-press mt-6 block rounded-full bg-coral-500 py-3 text-center font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)]"
      >
        {cp.checkout}
      </Link>
    </div>
  );
}
