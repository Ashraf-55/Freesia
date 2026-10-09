"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Wraps a grid (product cards, category cards) so the whole group is
 * observed once, and the moment it scrolls into view every child with
 * the .stagger-item class cascades in on its own transition-delay —
 * instead of all cards animating the instant the page mounts, off
 * screen and unseen. Pair each direct grid item with:
 *   <div className="stagger-item" style={{ transitionDelay: `${i * 60}ms` }}>
 */
export default function StaggerGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      const t = window.setTimeout(() => setInView(true), 0);
      return () => window.clearTimeout(t);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`stagger-container ${inView ? "in-view" : ""} ${className}`}>
      {children}
    </div>
  );
}
