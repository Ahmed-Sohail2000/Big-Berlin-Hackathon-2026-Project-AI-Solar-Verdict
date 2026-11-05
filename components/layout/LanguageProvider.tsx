"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { DICTIONARIES, type Dictionary } from "@/lib/i18n/dictionary";
import { formatNumber, LANGUAGE_COOKIE, type Language } from "@/lib/i18n/language";
import { translateMessage } from "@/lib/i18n/messages";

const ONE_YEAR_S = 365 * 24 * 60 * 60;

interface LanguageContextValue {
  language: Language;
  t: Dictionary;
  /** Shows a sentence from `lib/tile-count` or the workspace state in the chosen language. */
  msg: (text: string) => string;
  number: (value: number, digits?: number) => string;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Switches in place, with no navigation, so an open roof keeps its photo and every
 * value. The cookie only lets the server render the right language on the next visit.
 */
export function LanguageProvider({ initial, children }: { initial: Language; children: ReactNode }) {
  const [language, setLanguageValue] = useState(initial);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      t: DICTIONARIES[language],
      msg: (text) => translateMessage(text, language),
      number: (amount, digits) => formatNumber(amount, language, digits),
      setLanguage(next) {
        setLanguageValue(next);
        document.documentElement.lang = next;
        const secure = location.protocol === "https:" ? "; Secure" : "";
        document.cookie = `${LANGUAGE_COOKIE}=${next}; Path=/; Max-Age=${ONE_YEAR_S}; SameSite=Lax${secure}`;
      },
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage needs a LanguageProvider.");
  return value;
}
