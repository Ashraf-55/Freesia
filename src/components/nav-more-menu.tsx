"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * "More" dropdown for the desktop navbar. The navbar is a server component
 * that stays mounted across client-side navigation, so a plain <details>
 * kept itself open after picking a category. This closes the menu whenever
 * the route changes, on outside click, and on Escape.
 */
export default function NavMoreMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer transition-colors hover:text-coral-600"
      >
        {label} ▾
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="absolute end-0 top-full z-50 mt-2 min-w-40 rounded-[var(--radius-md)] bg-white p-2 shadow-[var(--shadow-soft)] ring-1 ring-blush-100"
        >
          {children}
        </div>
      )}
    </div>
  );
}
