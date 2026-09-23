"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = { href: string; label: string };

function NavList({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`block rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-coral-50 text-coral-600" : "text-ink-700 hover:bg-blush-50"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Admin dashboard navigation. Renders as a normal always-visible
 * sidebar on desktop/tablet, and collapses into a hamburger-triggered
 * slide-in drawer on mobile so the dashboard tables/forms get the
 * full screen width instead of being squeezed beside a fixed sidebar.
 */
export default function AdminSidebar({
  items,
  dashboardLabel,
  roleLabel,
  menuLabel,
  closeLabel,
}: {
  items: NavItem[];
  dashboardLabel: string;
  roleLabel: string;
  menuLabel: string;
  closeLabel: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <div>
          <p className="font-bold text-ink-900">{dashboardLabel}</p>
          <p className="text-xs text-ink-500">{roleLabel}</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label={menuLabel}
          className="btn-press flex h-10 w-10 items-center justify-center rounded-full border border-ink-300 text-xl text-ink-700"
        >
          ☰
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="mb-6 animate-fade-up">
          <p className="font-bold text-ink-900">{dashboardLabel}</p>
          <p className="text-xs text-ink-500">{roleLabel}</p>
        </div>
        <NavList items={items} pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink-900/50 lg:hidden" onClick={() => setOpen(false)}>
          <div
            className="panel-slide animate-slide-in-panel h-full w-72 max-w-[85vw] overflow-y-auto bg-white p-5 shadow-[var(--shadow-lift)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              aria-label={closeLabel}
              className="btn-press mb-4 flex h-9 w-9 items-center justify-center rounded-full text-xl text-ink-700 hover:bg-blush-50"
            >
              ✕
            </button>
            <NavList items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
