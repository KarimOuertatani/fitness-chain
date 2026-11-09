"use client";

import { CERTIFICATE_CONTRACTS } from "@/lib/contracts";
import { useState } from "react";
import { Award, BookOpen, Dumbbell, Inbox } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { PageHeader, TabPanel, Tabs } from "@/components/ui";
import { NotDeployedState } from "@/components/shared/NotDeployedState";
import { RequireWallet } from "@/components/wallet/RequireWallet";
import { CatalogTab } from "@/components/coach/CatalogTab";
import { MyRequestsTab } from "@/components/coach/MyRequestsTab";
import { MyCertificatesTab } from "@/components/coach/MyCertificatesTab";
import { MyGymsTab } from "@/components/coach/MyGymsTab";

type TabKey = "catalogue" | "demandes" | "certificats" | "salles";

export function CoachView() {
  const { isAvailable } = useWallet();
  const deployed = isAvailable(CERTIFICATE_CONTRACTS);
  const [tab, setTab] = useState<TabKey>("catalogue");

  return (
    <>
      <PageHeader title="Espace coach" subtitle="Formez-vous auprès des centres agréés, recevez vos certificats Soulbound et rejoignez des salles." />
      <RequireWallet message="Connectez MetaMask pour accéder à votre espace coach.">
        {!deployed ? (
          <NotDeployedState what="votre espace coach" />
        ) : (
          <>
            <Tabs<TabKey>
              label="Espace coach"
              active={tab}
              onChange={setTab}
              tabs={[
                { key: "catalogue", label: "Catalogue des formations", icon: BookOpen },
                { key: "demandes", label: "Mes demandes", icon: Inbox },
                { key: "certificats", label: "Mes certificats", icon: Award },
                { key: "salles", label: "Mes salles", icon: Dumbbell },
              ]}
            />
            <TabPanel>
              {tab === "catalogue" && <CatalogTab />}
              {tab === "demandes" && <MyRequestsTab />}
              {tab === "certificats" && <MyCertificatesTab />}
              {tab === "salles" && <MyGymsTab />}
            </TabPanel>
          </>
        )}
      </RequireWallet>
    </>
  );
}
