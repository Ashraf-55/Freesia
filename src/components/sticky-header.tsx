"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Wraps the navbar so it gains a soft shadow/blur once the page has
 * scrolled past the top — a small, elegant cue that doesn't touch any
 * of the existing brand colors. The navbar's own JSX (server-rendered,
 * with auth/category data) is passed in as children.
 */
export default function StickyHeader({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`animate-fade-down sticky top-0 z-40 border-b bg-white/90 backdrop-blur transition-shadow duration-300 ${
        scrolled ? "border-blush-100 shadow-[var(--shadow-soft)]" : "border-transparent"
      }`}
    >
      {children}
    </header>
  );
}
