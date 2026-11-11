import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { NetworkBanner } from "@/components/layout/NetworkBanner";

/** Interface applicative : barre latérale (desktop), barre du haut, contenu, navigation mobile. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <div className="min-h-dvh lg:pl-[17rem]">
        <Topbar />
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-32 sm:px-6 lg:px-10 lg:pt-8 lg:pb-16">
          <NetworkBanner />
          <main id="contenu" className="min-w-0">
            {children}
          </main>
        </div>
      </div>
      <BottomNav />
    </>
  );
}
