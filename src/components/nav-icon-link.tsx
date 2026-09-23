"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Cart/wishlist navbar icon that plays a small "bump" whenever a
 * matching `window` CustomEvent fires elsewhere on the page (quick-add,
 * product page add-to-cart, wishlist toggle). Keeps the navbar itself
 * a simple server component while still giving instant feedback.
 */
export default function NavIconLink({
  href,
  label,
  icon,
  eventName,
}: {
  href: string;
  label: string;
  icon: string;
  eventName: string;
}) {
  const [bump, setBump] = useState(false);

  useEffect(() => {
    function onEvent() {
      setBump(true);
      window.setTimeout(() => setBump(false), 500);
    }
    window.addEventListener(eventName, onEvent);
    return () => window.removeEventListener(eventName, onEvent);
  }, [eventName]);

  return (
    <Link
      href={href}
      aria-label={label}
      className={`inline-block text-lg text-ink-700 transition hover:scale-110 hover:text-coral-600 ${
        bump ? "animate-bump text-coral-600" : ""
      }`}
    >
      {icon}
    </Link>
  );
}
