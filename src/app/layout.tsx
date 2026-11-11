import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";

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
          {children}
        </Providers>
      </body>
    </html>
  );
}
