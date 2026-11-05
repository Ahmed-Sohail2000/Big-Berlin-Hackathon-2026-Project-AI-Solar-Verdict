"use client";

import { Moon, Sun } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

/** Flips the theme on <html>. CSS alone picks the icon, so server and client markup always match. */
function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === "light" ? "dark" : "light";
  root.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch {
    // Storage can be blocked. The theme still applies for this visit.
  }
}

export function ThemeToggle() {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={t.header.theme}
      className="rounded-md border border-border p-2 text-muted transition-colors hover:text-foreground"
    >
      <Sun className="h-4 w-4 light:hidden" aria-hidden />
      <Moon className="hidden h-4 w-4 light:block" aria-hidden />
    </button>
  );
}
