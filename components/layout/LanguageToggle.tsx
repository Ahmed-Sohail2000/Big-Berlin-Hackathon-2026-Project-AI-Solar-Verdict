"use client";

import { LANGUAGES } from "@/lib/i18n/language";
import { useLanguage } from "./LanguageProvider";

const NAMES = { de: "Deutsch", en: "English" };

/** Each language is named in itself, so someone who cannot read the page can still find theirs. */
export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div role="group" aria-label={t.header.language} className="flex overflow-hidden rounded-md border border-border">
      {LANGUAGES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-label={NAMES[option]}
          aria-pressed={language === option}
          onClick={() => setLanguage(option)}
          className={`px-2.5 py-2 font-mono text-xs font-semibold uppercase transition-colors ${
            language === option ? "bg-surface-raised text-accent" : "text-muted hover:text-foreground"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
