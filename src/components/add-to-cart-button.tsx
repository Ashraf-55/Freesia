"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClientDictionary } from "@/lib/i18n/use-locale";
import { useToast } from "@/components/toast-provider";

export default function AddToCartButton({ productId }: { productId: string }) {
  const router = useRouter();
  const { dict } = useClientDictionary();
  const showToast = useToast();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addToCart() {
    setLoading(true);
    setError(null);
    setAdded(false);

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, qty: 1 }),
      });

      // Never show success unless the request actually succeeded
      // (spec §16 — no success message on a failed request).
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = data?.error ?? dict.productPage.genericError;
        setError(message);
        showToast(message, "error");
        return;
      }

      setAdded(true);
      showToast(dict.productPage.added, "success");
      window.dispatchEvent(new CustomEvent("freesia:cart-changed"));
      router.refresh();
      setTimeout(() => setAdded(false), 1500);
    } catch {
      setError(dict.productPage.genericError);
      showToast(dict.productPage.genericError, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={addToCart}
        disabled={loading}
        className="btn-press w-full rounded-full bg-coral-500 py-3 font-semibold text-white shadow-sm transition-all duration-300 hover:bg-coral-600 hover:shadow-[var(--shadow-gold)] disabled:opacity-60"
      >
        <span className={added ? "animate-scale-in inline-flex items-center gap-2" : ""}>
          {added && "✓ "}
          {added ? dict.productPage.added : loading ? dict.productPage.adding : dict.productPage.addToCart}
        </span>
      </button>
      {error && <p className="animate-fade-in mt-2 text-center text-sm text-[var(--error)]">{error}</p>}
    </div>
  );
}
