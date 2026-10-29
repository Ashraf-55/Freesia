/**
 * Formats a price pair (today price, or season price) as a single
 * number when min == max — identical to the old single-price look —
 * or as "min - max" when the admin has actually set a range.
 *
 * Callers append the currency label themselves (matches the existing
 * `{value} {dict.common.currency}` pattern used everywhere else).
 */
export function formatPriceRange(min: number, max: number): string {
  return min === max ? `${min}` : `${min} - ${max}`;
}
