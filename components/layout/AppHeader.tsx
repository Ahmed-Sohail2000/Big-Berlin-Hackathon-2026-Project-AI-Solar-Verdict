"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, BookOpen, ShieldCheck } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader() {
  const { t } = useLanguage();
  const inTool = usePathname() === "/tool";
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-surface px-5 py-3">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        HelioSense <span className="font-normal text-muted">Roof Count</span>
      </Link>
      <span className="hidden items-center gap-1.5 text-sm text-muted lg:flex">
        <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
        {t.header.tagline}
      </span>
      <nav className="ml-auto flex flex-wrap items-center gap-2">
        {!inTool && (
          <Link
            href="/tool"
            className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-contrast transition-opacity hover:opacity-90"
          >
            {t.header.openTool}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
        <Link
          href="/guide"
          className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          {t.header.guide}
        </Link>
        <LanguageToggle />
        <ThemeToggle />
      </nav>
    </header>
  );
}
