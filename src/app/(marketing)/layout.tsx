import { MarketingNav } from "@/components/layout/MarketingNav";
import { MarketingFooter } from "@/components/layout/MarketingFooter";

/** Mise en page de la vitrine (accueil) : barre de navigation en haut, pleine largeur. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingNav />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
