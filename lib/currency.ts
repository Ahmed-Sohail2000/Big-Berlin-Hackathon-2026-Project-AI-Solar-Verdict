// Display-currency helpers. All sizing/financial math is computed in a EUR
// base; these convert amounts for DISPLAY only, using fixed demo rates. Swap
// the rates for a live FX feed later without touching any call site.

export type CurrencyCode = "EUR" | "USD" | "AED";

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  /** Units of this currency per 1 EUR (demo rates; refresh from a live feed later). */
  perEur: number;
}

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  EUR: { code: "EUR", symbol: "€", perEur: 1 },
  USD: { code: "USD", symbol: "$", perEur: 1.08 },
  AED: { code: "AED", symbol: "AED ", perEur: 3.99 },
};

export const CURRENCY_CODES: CurrencyCode[] = ["EUR", "USD", "AED"];

/** Map a country (ISO-3166 alpha-2) to its display currency. Defaults to EUR. */
export function currencyForCountry(country?: string): CurrencyCode {
  switch ((country ?? "").toUpperCase()) {
    case "US":
      return "USD";
    case "AE":
      return "AED";
    default:
      return "EUR"; // DE/FR/ES/IT/NL/PL/… and anything else
  }
}

/** Format a EUR amount in the given currency (rounded, no decimals). */
export function formatMoney(eurAmount: number, code: CurrencyCode): string {
  const c = CURRENCIES[code];
  return `${c.symbol}${Math.round(eurAmount * c.perEur).toLocaleString()}`;
}
