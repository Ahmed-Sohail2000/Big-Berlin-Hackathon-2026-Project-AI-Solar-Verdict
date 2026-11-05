import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { cookies, headers } from "next/headers";
import { AppHeader } from "@/components/layout/AppHeader";
import { LanguageProvider } from "@/components/layout/LanguageProvider";
import { WorkspaceProvider } from "@/components/tile-count/state/WorkspaceProvider";
import { LANGUAGE_COOKIE, resolveLanguage } from "@/lib/i18n/language";
import "./globals.css";

/** Built for engineering documents: clear at reading size, and figures that line up. */
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "HelioSense Roof Count",
  description: "Count roof tiles from a photo and turn them into exact dimensions for the CAD drawing.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/** Runs before first paint so a saved light theme never flashes dark. */
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(!t&&matchMedia("(prefers-color-scheme: light)").matches)t="light";if(t==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const language = resolveLanguage(
    (await cookies()).get(LANGUAGE_COOKIE)?.value,
    (await headers()).get("accept-language"),
  );

  return (
    <html lang={language} className={`${plexSans.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="antialiased">
        <LanguageProvider initial={language}>
          <WorkspaceProvider>
            <AppHeader />
            {children}
          </WorkspaceProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
