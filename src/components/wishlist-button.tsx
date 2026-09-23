"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClientDictionary } from "@/lib/i18n/use-locale";
import { useToast } from "@/components/toast-provider";

export default function WishlistButton({
  productId,
  initialActive,
}: {
  productId: string;
  initialActive: boolean;
}) {
  const router = useRouter();
  const { dict } = useClientDictionary();
  const showToast = useToast();
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);
  const [pop, setPop] = useState(false);

  async function toggle() {
    setLoading(true);
    const method = active ? "DELETE" : "POST";
    const res = await fetch(
      method === "DELETE" ? `/api/wishlist?productId=${productId}` : "/api/wishlist",
      method === "DELETE"
        ? { method }
        : {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          }
    );
    if (res.status === 401) {
      router.push("/login");
      setLoading(false);
      return;
    }
    const nextActive = !active;
    setActive(nextActive);
    setLoading(false);
    setPop(true);
    window.setTimeout(() => setPop(false), 450);
    if (nextActive) showToast(dict.productPage.addToWishlist, "success");
    window.dispatchEvent(new CustomEvent("freesia:wishlist-changed"));
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={dict.productPage.addToWishlist}
      className={`btn-press flex h-10 w-10 items-center justify-center rounded-full border text-lg transition-colors duration-300 ${
        active ? "border-coral-500 bg-coral-50 text-coral-600" : "border-ink-300 text-ink-500 hover:border-coral-300 hover:text-coral-500"
      } ${pop ? "animate-heart-pop" : ""}`}
    >
      {active ? "♥" : "♡"}
    </button>
  );
}
