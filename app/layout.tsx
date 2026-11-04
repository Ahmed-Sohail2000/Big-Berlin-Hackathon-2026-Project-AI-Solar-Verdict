import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="antialiased">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
