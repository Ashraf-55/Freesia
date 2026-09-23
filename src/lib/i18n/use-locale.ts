"use client";

import { useEffect, useState } from "react";
import { dictionaryFor } from "./dictionaries";
import { defaultLocale, LOCALE_COOKIE, type Locale } from "./shared";

function readCookieLocale(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  const value = match?.[1];
  return value === "en" || value === "ar" ? value : defaultLocale;
}

/**
 * Client-side counterpart to the server `getDictionary()` helper. Reads the
 * same `freesia_locale` cookie the language switcher writes. Renders with
 * `defaultLocale` on the very first paint (matches SSR output, no hydration
 * mismatch), then syncs to the real cookie value right after mount.
 */
export function useClientDictionary() {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    setLocaleState(readCookieLocale());
  }, []);

  return { locale, dict: dictionaryFor(locale) };
}
