"use client";

import Link from "next/link";
import { useState } from "react";
import { dictionaryFor } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/shared";

type Category = { id: string; slug: string; nameAr: string; nameEn: string };
type SessionUser = { role: "admin" | "employee" | "customer" } | null;

export default function MobileMenu({
  categories,
  user,
  locale,
}: {
  categories: Category[];
  user: SessionUser;
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dict = dictionaryFor(locale);
  const catName = (c: Category) => (locale === "ar" ? c.nameAr : c.nameEn);

  function show() {
    setMounted(true);
    // Mount closed first, then flip to open on the next frame so the
    // panel/backdrop transitions actually play instead of snapping in.
    requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
  }

  function hide() {
    setOpen(false);
    window.setTimeout(() => setMounted(false), 320);
  }

  return (
    <>
      <button
        onClick={show}
        aria-label={dict.common.menu}
        className="btn-press text-2xl text-ink-700 transition-transform md:hidden"
      >
        ☰
      </button>

      {mounted && (
        <div
          className={`fixed inset-0 z-50 flex justify-end md:hidden transition-colors duration-300 ${
            open ? "bg-ink-900/50" : "bg-ink-900/0"
          }`}
          onClick={hide}
        >
          <div
            className={`panel-slide h-full w-72 max-w-[85vw] overflow-y-auto bg-white p-5 shadow-[var(--shadow-lift)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              open ? "translate-x-0" : "translate-x-[var(--panel-from,100%)]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={hide} aria-label={dict.common.close} className="btn-press mb-4 flex h-9 w-9 items-center justify-center rounded-full text-xl text-ink-700 transition-colors hover:bg-blush-50">
              ✕
            </button>

            <form action="/search" className="mb-4">
              <input
                type="text"
                name="q"
                placeholder={dict.common.searchPlaceholder}
                className="w-full rounded-full border border-ink-300 px-4 py-2.5 text-sm transition focus:border-coral-500 focus:outline-none"
              />
            </form>

            <ul className="space-y-1 text-ink-700">
              <li>
                <Link href="/" onClick={hide} className="block rounded-md px-3 py-2.5 transition-colors hover:bg-blush-50 active:bg-blush-100">
                  {dict.nav.home}
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/category/${c.slug}`}
                    onClick={hide}
                    className="block rounded-md px-3 py-2.5 transition-colors hover:bg-blush-50 active:bg-blush-100"
                  >
                    {catName(c)}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/cart" onClick={hide} className="block rounded-md px-3 py-2.5 transition-colors hover:bg-blush-50 active:bg-blush-100">
                  {dict.nav.cart} 🛍
                </Link>
              </li>
              <li>
                <Link href="/wishlist" onClick={hide} className="block rounded-md px-3 py-2.5 transition-colors hover:bg-blush-50 active:bg-blush-100">
                  {dict.nav.wishlist} ♡
                </Link>
              </li>
              {user?.role === "customer" ? (
                <li>
                  <Link href="/account" onClick={hide} className="block rounded-md px-3 py-2.5 transition-colors hover:bg-blush-50 active:bg-blush-100">
                    {dict.nav.account}
                  </Link>
                </li>
              ) : !user ? (
                <li>
                  <Link href="/login" onClick={hide} className="block rounded-md px-3 py-2.5 transition-colors hover:bg-blush-50 active:bg-blush-100">
                    {dict.nav.login}
                  </Link>
                </li>
              ) : (
                <li>
                  <Link href="/admin" onClick={hide} className="block rounded-md px-3 py-2.5 transition-colors hover:bg-blush-50 active:bg-blush-100">
                    {dict.nav.dashboard}
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
