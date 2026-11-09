import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { NetworkBanner } from "@/components/layout/NetworkBanner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Fitness Chain",
    template: "%s · Fitness Chain",
  },
  description:
    "La confiance fitness, propulsée par la blockchain : certificats de coachs, salles, abonnements et récompenses en FitCoin.",
};

export const viewport: Viewport = {
  themeColor: "#0d1226",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning : certaines extensions de navigateur ajoutent des attributs à <html>
    // (ex. bbai-tooltip-injected) avant l'hydratation. Ne concerne que les attributs de cette balise.
    <html lang="fr" className={`${inter.variable} antialiased`} suppressHydrationWarning>
      <body className="font-sans">
        <Providers>
          <a
            href="#contenu"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2"
          >
            Aller au contenu
          </a>
          <Sidebar />
          <div className="min-h-dvh px-4 pb-32 sm:px-6 lg:pb-12 lg:pl-[18.5rem] lg:pr-8">
            <div className="mx-auto w-full max-w-6xl">
              <Header />
              <NetworkBanner />
              <main id="contenu" className="min-w-0">
                {children}
              </main>
            </div>
          </div>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
