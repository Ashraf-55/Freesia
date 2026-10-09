"use client";

import { useSyncExternalStore } from "react";
import { dictionaryFor } from "./dictionaries";
import { defaultLocale, LOCALE_COOKIE, type Locale } from "./shared";

function readCookieLocale(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  const value = match?.[1];
  return value === "en" || value === "ar" ? value : defaultLocale;
}

// The cookie only changes through a full page reload (language switcher),
// so there is nothing to subscribe to.
const subscribeNoop = () => () => {};

/**
 * Client-side counterpart to the server `getDictionary()` helper. Reads the
 * same `freesia_locale` cookie the language switcher writes. Renders with
 * `defaultLocale` on the very first paint (matches SSR output, no hydration
 * mismatch), then syncs to the real cookie value right after mount.
 */
export function useClientDictionary() {
  // `useSyncExternalStore` gives exactly that behaviour: the server snapshot
  // (and the hydration render) is `defaultLocale`, then React switches to the
  // real cookie value right after hydration — with no setState-in-effect.
  const locale = useSyncExternalStore<Locale>(subscribeNoop, readCookieLocale, () => defaultLocale);

  return { locale, dict: dictionaryFor(locale) };
}
