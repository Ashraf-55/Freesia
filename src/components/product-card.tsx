"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useClientDictionary } from "@/lib/i18n/use-locale";
import { useToast } from "@/components/toast-provider";

type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  nameEn?: string | null;
  price: unknown;
  discountPrice: unknown;
  badge: string | null;
  images: { filename: string }[];
};

const BADGE_STYLES: Record<string, string> = {
  New: "bg-emerald-700 text-white",
  "Best Seller": "bg-gold-600 text-white",
  Sale: "bg-coral-600 text-white",
  Premium: "bg-ink-900 text-white",
};

export default function ProductCard({ product }: { product: ProductCardData }) {
  const router = useRouter();
  const { locale, dict } = useClientDictionary();
  const pc = dict.productCard;
  const displayName = locale === "en" && product.nameEn ? product.nameEn : product.name;
  const [adding, setAdding] = useState(false);
  const [wishActive, setWishActive] = useState(false);
  const [wishPop, setWishPop] = useState(false);
  const showToast = useToast();

  const badgeLabels: Record<string, string> = {
    New: pc.badgeNew,
    "Best Seller": pc.badgeBestseller,
    Sale: pc.badgeSale,
    Premium: pc.badgePremium,
  };

  async function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, qty: 1 }),
    });
    setAdding(false);
    if (res.ok) {
      showToast(`${pc.quickAdd} — ${displayName}`, "success");
      window.dispatchEvent(new CustomEvent("freesia:cart-changed"));
      router.refresh();
    } else {
      showToast(dict.productPage.genericError, "error");
    }
  }

  async function quickWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id }),
    });
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.ok) {
      setWishActive(true);
      setWishPop(true);
      window.setTimeout(() => setWishPop(false), 450);
      window.dispatchEvent(new CustomEvent("freesia:wishlist-changed"));
    }
  }

  return (
    <div className="luxury-card group relative overflow-hidden rounded-[var(--radius-lg)] bg-white ring-1 ring-blush-100 shadow-[var(--shadow-soft)]">
      <button
        onClick={quickWishlist}
        aria-label={pc.addToWishlist}
        className={`btn-press absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 shadow backdrop-blur transition hover:bg-white hover:text-coral-600 ${
          wishActive ? "text-coral-600" : "text-ink-700"
        } ${wishPop ? "animate-heart-pop" : ""}`}
      >
        {wishActive ? "♥" : "♡"}
      </button>

      <Link href={`/product/${product.slug}`}>
        {/* Contain — never crops the product photo, whatever its real
            proportions are (mugs, boxes, bouquets all differ). */}
        <div className="media-frame relative aspect-[4/5] overflow-hidden">
          {product.images[0] ? (
            <Image
              src={`/images/${product.images[0].filename}`}
              alt={displayName}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-contain p-5 transition duration-700 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <Image
              src="/images/brand/freesia_logo.png"
              alt={displayName}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-contain p-10 opacity-30"
            />
          )}
          {product.badge && (
            <span
              className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide shadow ${
                BADGE_STYLES[product.badge] ?? "bg-ink-900 text-white"
              }`}
            >
              {badgeLabels[product.badge] ?? product.badge}
            </span>
          )}
        </div>
        <div className="border-t border-blush-100 p-4">
          <div className="line-clamp-1 font-semibold text-ink-900">{displayName}</div>
          <div className="mt-1.5 flex items-center gap-2">
            {product.discountPrice ? (
              <>
                <span className="font-bold text-coral-600">{Number(product.discountPrice)} {dict.common.currency}</span>
                <span className="text-sm text-ink-300 line-through">{Number(product.price)} {dict.common.currency}</span>
              </>
            ) : (
              <span className="font-bold text-ink-900">{Number(product.price)} {dict.common.currency}</span>
            )}
          </div>
        </div>
      </Link>

      <button
        onClick={quickAdd}
        disabled={adding}
        className="btn-press w-full border-t border-blush-100 py-2.5 text-sm font-semibold text-coral-600 transition hover:bg-blush-50 disabled:opacity-60"
      >
        {adding ? pc.adding : `+ ${pc.quickAdd}`}
      </button>
    </div>
  );
}
