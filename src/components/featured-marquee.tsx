"use client";

import { useEffect, useRef, useState } from "react";
import ProductCard from "@/components/product-card";

type FeaturedProduct = Parameters<typeof ProductCard>[0]["product"];

// Constant visual speed regardless of how many featured products there
// are today (sales-driven, so the count changes) — duration is derived
// from the track's actual width, not a fixed number of seconds.
const PIXELS_PER_SECOND = 40;
const MIN_DURATION_S = 22;
const MAX_DURATION_S = 70;

/**
 * Infinite/seamless marquee for Featured Products only.
 *
 *  - Renders the list twice back-to-back and animates translateX from
 *    0 to the exact measured width of one set (--marquee-shift, read
 *    from the DOM rather than assumed as 50%, so gaps/rounding can
 *    never throw the loop off by a pixel): since both halves are
 *    identical, the instant it completes one loop it's already
 *    sitting on an identical frame — no visible reset, no gap.
 *  - Animation duration is measured from the real rendered width of
 *    one set (via ResizeObserver) so speed stays constant however many
 *    cards there are, and however the responsive card width changes.
 *  - Hover-to-pause is plain CSS (.featured-marquee:hover), so it only
 *    ever engages on devices that actually have hover — never
 *    interferes with touch/scroll on mobile.
 *  - Respects prefers-reduced-motion by not animating (or duplicating)
 *    at all: renders one static, natively horizontally-scrollable row
 *    instead. This is also the server-rendered / no-JS default, so the
 *    page never flashes a duplicated list before hydration.
 */
export default function FeaturedMarquee({ products }: { products: FeaturedProduct[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [motionOk, setMotionOk] = useState(false);
  const [durationS, setDurationS] = useState(MAX_DURATION_S);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionOk(!query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!motionOk) return;
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      // Both sets are flattened as direct siblings of the track (same
      // count each). The first card of the *duplicate* set sits at
      // exactly the offset we need to shift by for a pixel-perfect
      // loop — reading it directly means no assumption about gap
      // size, card width, or rounding has to be made by hand.
      const firstDuplicate = track.children[products.length] as HTMLElement | undefined;
      const shift = firstDuplicate?.offsetLeft ?? track.scrollWidth / 2;
      track.style.setProperty("--marquee-shift", `${shift}px`);
      const seconds = shift / PIXELS_PER_SECOND;
      setDurationS(Math.min(MAX_DURATION_S, Math.max(MIN_DURATION_S, seconds)));
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [motionOk, products.length]);

  if (products.length === 0) return null;

  if (!motionOk) {
    // Static fallback: one row, natively scrollable, no motion.
    return (
      <div className="flex gap-5 overflow-x-auto pb-2" role="region" aria-label="Featured products">
        {products.map((p) => (
          <div key={p.id} className="w-44 flex-shrink-0 sm:w-56 md:w-60 lg:w-64">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="featured-marquee -mx-4 overflow-hidden px-4" role="region" aria-label="Featured products">
      <div ref={trackRef} className="featured-marquee-track flex w-max gap-5" style={{ ["--marquee-duration" as string]: `${durationS}s` }}>
        {products.map((p) => (
          <div key={p.id} className="w-44 flex-shrink-0 sm:w-56 md:w-60 lg:w-64">
            <ProductCard product={p} />
          </div>
        ))}
        {/* Duplicate set (flattened as direct siblings, not nested —
            see the offsetLeft measurement above) completes the
            seamless loop. Hidden from assistive tech and removed from
            the tab order: it's a purely visual echo of the products
            above, not new content. */}
        {products.map((p) => (
          <div key={`dup-${p.id}`} className="w-44 flex-shrink-0 sm:w-56 md:w-60 lg:w-64" aria-hidden="true" inert>
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
