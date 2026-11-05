import Link from "next/link";
import { BookOpen, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader() {
  return (
    <header className="flex items-center gap-4 border-b border-border bg-surface px-5 py-3">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        HelioSense <span className="font-normal text-muted">Roof Count</span>
      </Link>
      <span className="hidden items-center gap-1.5 text-sm text-muted md:flex">
        <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
        Photos stay on this device
      </span>
      <nav className="ml-auto flex items-center gap-2">
        <Link
          href="/guide"
          className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          User guide
        </Link>
        <ThemeToggle />
      </nav>
    </header>
  );
}
