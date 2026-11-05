// lib/i18n/language.ts
// The languages of the interface, and how one is chosen for a request.
// PURE, DETERMINISTIC, no I/O.

export const LANGUAGES = ["de", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

/** Holds the employee's choice and nothing else. It is never tied to a person. */
export const LANGUAGE_COOKIE = "language";

/** A saved choice wins, then the browser's first language. Anything unknown means English. */
export function resolveLanguage(saved: string | undefined, acceptLanguage: string | null): Language {
  if (LANGUAGES.includes(saved as Language)) return saved as Language;
  return acceptLanguage?.trim().toLowerCase().startsWith("de") ? "de" : "en";
}

/**
 * German writes 10,80 where English writes 10.80. Without `digits` a value keeps its own
 * precision. Display only: stored values stay numbers.
 */
export function formatNumber(value: number, language: Language, digits?: number): string {
  const text = digits === undefined ? String(value) : value.toFixed(digits);
  return language === "de" ? text.replace(".", ",") : text;
}
