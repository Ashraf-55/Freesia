"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useClientDictionary } from "@/lib/i18n/use-locale";
import { useToast } from "@/components/toast-provider";

type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  nameEn?: string | null;
  price: unknown;
  // Optional "starting price" — only ever set for natural/artificial
  // flowers (see admin/product-form.tsx). Every other category is
  // always a plain fixed price.
  startingPrice: unknown;
  badge: string | null;
  images: { filename: string }[];
};

const BADGE_STYLES: Record<string, string> = {
  New: "bg-emerald-700 text-white",
  "Best Seller": "bg-gold-600 text-white",
  Sale: "bg-coral-600 text-white",
  Premium: "bg-ink-900 text-white",
};

// One shared (and short-lived) lookup of "which products is this visitor's
// wishlist holding" so every card on a page can show the right heart state
// for the cost of a single request. Guests simply get an empty set.
let wishlistIdsCache: { at: number; ids: Promise<Set<string>> } | null = null;
function loadWishlistIds(): Promise<Set<string>> {
  if (wishlistIdsCache && Date.now() - wishlistIdsCache.at < 3000) return wishlistIdsCache.ids;
  const ids = fetch("/api/wishlist")
    .then((r) => (r.ok ? r.json() : { items: [] }))
    .then((d: { items?: { productId: string }[] }) => new Set((d.items ?? []).map((i) => i.productId)))
    .catch(() => new Set<string>());
  wishlistIdsCache = { at: Date.now(), ids };
  return ids;
}

export default function ProductCard({ product }: { product: ProductCardData }) {
  const router = useRouter();
  const { locale, dict } = useClientDictionary();
  const pc = dict.productCard;
  const displayName = locale === "en" && product.nameEn ? product.nameEn : product.name;
  const [adding, setAdding] = useState(false);
  const [wishActive, setWishActive] = useState(false);
  const [wishPop, setWishPop] = useState(false);
  const showToast = useToast();
  // Products without a real price yet are shown as "price on request" and are ordered via Contact Us.
  const onRequest = Number(product.price) <= 0;

  useEffect(() => {
    let alive = true;
    loadWishlistIds().then((ids) => {
      if (alive && ids.has(product.id)) setWishActive(true);
    });
    return () => {
      alive = false;
    };
  }, [product.id]);

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
    // Toggle: a filled heart removes the product from the wishlist again.
    const removing = wishActive;
    const res = await fetch(removing ? `/api/wishlist?productId=${product.id}` : "/api/wishlist", {
      method: removing ? "DELETE" : "POST",
      headers: removing ? undefined : { "Content-Type": "application/json" },
      body: removing ? undefined : JSON.stringify({ productId: product.id }),
    });
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (!res.ok) {
      showToast(dict.productPage.genericError, "error");
      return;
    }
    const ids = wishlistIdsCache ? await wishlistIdsCache.ids : null;
    if (removing) ids?.delete(product.id);
    else ids?.add(product.id);
    setWishActive(!removing);
    if (!removing) {
      setWishPop(true);
      window.setTimeout(() => setWishPop(false), 450);
    }
    window.dispatchEvent(new CustomEvent("freesia:wishlist-changed"));
    // On the wishlist page this re-fetches the list so a removed card disappears.
    router.refresh();
  }

  return (
    <div className="luxury-card group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] bg-white ring-1 ring-blush-100 shadow-[var(--shadow-soft)]">
      <button
        onClick={quickWishlist}
        aria-label={pc.addToWishlist}
        aria-pressed={wishActive}
        className={`btn-press absolute left-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 shadow backdrop-blur transition hover:bg-white hover:text-coral-600 ${
          wishActive ? "text-coral-600" : "text-ink-700"
        } ${wishPop ? "animate-heart-pop" : ""}`}
      >
        {wishActive ? "♥" : "♡"}
      </button>

      {/* flex-1 absorbs any extra height the grid row stretches onto
          this card (taller sibling cards, longer product names) so
          the "add to cart" button always sits flush with the card's
          bottom edge — same row, same level, across every card. */}
      <Link href={`/product/${product.slug}`} className="flex flex-1 flex-col">
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
          <div title={displayName} className="min-h-12 break-words font-semibold leading-6 text-ink-900">
            {displayName}
          </div>
          {product.startingPrice != null && !onRequest && Number(product.startingPrice) !== Number(product.price) && (
            <div className="mt-1 text-xs text-ink-400">
              {pc.startingFrom} {Number(product.startingPrice)} {dict.common.currency}
            </div>
          )}
          <div className="mt-1 flex items-center gap-2">
            <span className="font-bold text-ink-900">
              {onRequest
                ? product.startingPrice != null
                  ? `${pc.startingFrom} ${Number(product.startingPrice)} ${dict.common.currency}`
                  : dict.productPage.priceOnRequest
                : product.startingPrice != null && Number(product.startingPrice) === Number(product.price)
                  ? `${pc.startingFrom} ${Number(product.price)} ${dict.common.currency}`
                  : `${Number(product.price)} ${dict.common.currency}`}
            </span>
          </div>
        </div>
      </Link>

      {onRequest ? (
        <Link
          href={`/contact?product=${encodeURIComponent(product.slug)}`}
          className="btn-press block w-full border-t border-blush-100 py-2.5 text-center text-sm font-semibold text-coral-600 transition hover:bg-blush-50"
        >
          {pc.askForPrice}
        </Link>
      ) : (
        <button
          onClick={quickAdd}
          disabled={adding}
          className="btn-press w-full border-t border-blush-100 py-2.5 text-sm font-semibold text-coral-600 transition hover:bg-blush-50 disabled:opacity-60"
        >
          {adding ? pc.adding : `+ ${pc.quickAdd}`}
        </button>
      )}
    </div>
  );
}
