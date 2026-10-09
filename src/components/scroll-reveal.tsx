"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Wraps a section so it fades/slides into place the first time it
 * enters the viewport, instead of everything animating at once on
 * page load. Falls back to simply showing the content if
 * IntersectionObserver isn't available. Pairs with .reveal-on-scroll
 * in globals.css, which also handles prefers-reduced-motion.
 */
export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Entry direction for this section — varied on purpose across the
   * page so the scroll story doesn't feel repetitive. */
  direction?: "up" | "down" | "left" | "right" | "scale";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-dir={direction} className={`reveal-on-scroll ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
