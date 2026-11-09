import { Alert } from "@/components/ui";

export function IpfsMissingAlert() {
  return (
    <Alert tone="warning" title="Stockage IPFS non configuré">
      Ajoutez <code className="rounded bg-white/10 px-1">PINATA_JWT</code> dans <code className="rounded bg-white/10 px-1">frontend/.env.local</code>{" "}
      pour envoyer les fichiers. Vous pouvez continuer sans fichier (URI vide) pour une démonstration locale.
    </Alert>
  );
}
