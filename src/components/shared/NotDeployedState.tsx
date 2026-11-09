import { ServerCrash } from "lucide-react";
import { Card, EmptyState } from "@/components/ui";

/** État vide affiché quand les contrats ne sont pas déployés sur le réseau cible. */
export function NotDeployedState({ what = "les données" }: { what?: string }) {
  return (
    <Card>
      <EmptyState
        icon={ServerCrash}
        title="Contrats non déployés sur ce réseau"
        description={`Déployez les contrats pour afficher ${what}.`}
      />
    </Card>
  );
}
