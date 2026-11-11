import Link from "next/link";
import { LogoMark } from "@/components/layout/Logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <LogoMark size={28} />
          <span>Fitness Chain — mini-projet Blockchain, ESPRIT</span>
        </div>
        <nav aria-label="Liens du pied de page" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/dashboard" className="hover:text-white">
            Application
          </Link>
          <Link href="/salles" className="hover:text-white">
            Salles
          </Link>
          <Link href="/verifier" className="hover:text-white">
            Vérifier un certificat
          </Link>
          <Link href="/gouvernance" className="hover:text-white">
            Gouvernance
          </Link>
        </nav>
      </div>
    </footer>
  );
}
