"use client";

import { useState } from "react";
import { formatUnits } from "ethers";
import { ImageIcon, Save } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";
import { useTx } from "@/hooks/useTx";
import { useIpfsUpload } from "@/hooks/useIpfsUpload";
import { useMetadata } from "@/hooks/useMetadata";
import { getContract } from "@/lib/contracts";
import { tryParseFTC } from "@/lib/format";
import { translateError } from "@/lib/errors";
import type { Gym } from "@/types";
import { IpfsMissingAlert } from "@/components/shared/IpfsMissingAlert";
import { Button, Checkbox, FileInput, Input, Modal, Textarea, FtcGlyph } from "@/components/ui";

const toInput = (v: bigint) => formatUnits(v, 18).replace(/\.0$/, "");

export function EditGymModal({ gym, onClose }: { gym: Gym; onClose: () => void }) {
  const { canWrite } = useWallet();
  const { run, pending } = useTx();
  const { uploadMetadata, ipfsMissing, uploading } = useIpfsUpload();
  const { metadata } = useMetadata(gym.metadataURI);
  const [monthly, setMonthly] = useState(toInput(gym.monthlyFee));
  const [affiliation, setAffiliation] = useState(toInput(gym.affiliationFee));
  const [active, setActive] = useState(gym.active);
  const [description, setDescription] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);

  const monthlyValue = tryParseFTC(monthly);
  const affiliationValue = tryParseFTC(affiliation);
  const valid = monthlyValue !== null && monthlyValue > 0n && affiliationValue !== null;
  const busy = pending || uploading;
  const currentDescription = description ?? metadata?.description ?? "";

  const submit = async () => {
    if (!valid || monthlyValue === null || affiliationValue === null) return;
    try {
      let uri = gym.metadataURI;
      if (description !== null || photo) {
        const result = await uploadMetadata({
          metadata: {
            name: gym.name,
            description: currentDescription.trim(),
            ...(metadata?.image && !photo ? { image: metadata.image } : {}),
          },
          image: photo,
        });
        if (result === null) return;
        if (result) uri = result;
      }
      const receipt = await run(
        (signer) => getContract("GymManager", signer).updateGym(gym.id, monthlyValue, affiliationValue, uri, active),
        { success: "Salle mise à jour." }
      );
      if (receipt) onClose();
    } catch (error) {
      toast.error(translateError(error));
    }
  };

  return (
    <Modal
      open
      onClose={() => !busy && onClose()}
      dismissible={!busy}
      title={`Modifier ${gym.name}`}
      description="Les abonnements déjà payés ne sont pas affectés."
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button icon={Save} loading={busy} disabled={!canWrite || !valid} onClick={() => void submit()}>
            {ipfsMissing ? "Continuer sans fichier" : "Enregistrer"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Abonnement mensuel" inputMode="decimal" icon={FtcGlyph} suffix="FTC" value={monthly} onChange={(e) => setMonthly(e.target.value)} error={monthly && !valid && (monthlyValue === null || monthlyValue === 0n) ? "Doit être supérieur à 0." : null} />
        <Input label="Frais d'affiliation" inputMode="decimal" icon={FtcGlyph} suffix="FTC" value={affiliation} onChange={(e) => setAffiliation(e.target.value)} error={affiliation && affiliationValue === null ? "Montant invalide." : null} />
        <Textarea containerClassName="sm:col-span-2" label="Description (IPFS)" value={currentDescription} onChange={(e) => setDescription(e.target.value)} disabled={ipfsMissing} />
        <div className="sm:col-span-2">
          <FileInput label="Nouvelle photo (IPFS)" accept="image/*" file={photo} onChange={setPhoto} icon={ImageIcon} disabled={ipfsMissing} />
        </div>
        <div className="sm:col-span-2">
          <Checkbox label="Salle active" description="Une salle inactive n'apparaît plus dans l'annuaire et n'accepte plus d'abonnements ni de candidatures." checked={active} onChange={setActive} />
        </div>
        {ipfsMissing && (
          <div className="sm:col-span-2">
            <IpfsMissingAlert />
          </div>
        )}
      </div>
    </Modal>
  );
}
