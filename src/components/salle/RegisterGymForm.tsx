"use client";

import { useState } from "react";
import { Building2, ImageIcon, Save } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";
import { useTx } from "@/hooks/useTx";
import { useIpfsUpload } from "@/hooks/useIpfsUpload";
import { getContract } from "@/lib/contracts";
import { tryParseFTC } from "@/lib/format";
import { translateError } from "@/lib/errors";
import { IpfsMissingAlert } from "@/components/shared/IpfsMissingAlert";
import { Button, FileInput, Input, Textarea, FtcGlyph } from "@/components/ui";

/** Formulaire d'inscription d'une salle (registerGym). */
export function RegisterGymForm({ onDone }: { onDone?: () => void }) {
  const { canWrite } = useWallet();
  const { run, pending } = useTx();
  const { uploadMetadata, ipfsMissing, uploading, reset } = useIpfsUpload();
  const [name, setName] = useState("");
  const [monthly, setMonthly] = useState("30");
  const [affiliation, setAffiliation] = useState("40");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const monthlyValue = tryParseFTC(monthly);
  const affiliationValue = tryParseFTC(affiliation);
  const valid = name.trim().length > 0 && monthlyValue !== null && monthlyValue > 0n && affiliationValue !== null;
  const busy = pending || uploading;

  const submit = async () => {
    if (!valid || monthlyValue === null || affiliationValue === null) return;
    try {
      let uri = "";
      if (description.trim() || photo) {
        const result = await uploadMetadata({ metadata: { name: name.trim(), description: description.trim() }, image: photo });
        if (result === null) return;
        uri = result;
      }
      const receipt = await run(
        (signer) => getContract("GymManager", signer).registerGym(name.trim(), monthlyValue, affiliationValue, uri),
        { success: `${name.trim()} est inscrite sur Fitness Chain.` }
      );
      if (receipt) {
        reset();
        setName("");
        setDescription("");
        setPhoto(null);
        onDone?.();
      }
    } catch (error) {
      toast.error(translateError(error));
    }
  };

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Input containerClassName="sm:col-span-2" label="Nom de la salle" placeholder="Iron Gym" icon={Building2} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      <Input
        label="Abonnement mensuel"
        inputMode="decimal"
        icon={FtcGlyph}
        suffix="FTC"
        value={monthly}
        onChange={(e) => setMonthly(e.target.value)}
        error={monthly && (monthlyValue === null || monthlyValue === 0n) ? "Doit être supérieur à 0." : null}
      />
      <Input
        label="Frais d'affiliation (coachs)"
        inputMode="decimal"
        icon={FtcGlyph}
        suffix="FTC"
        value={affiliation}
        onChange={(e) => setAffiliation(e.target.value)}
        error={affiliation && affiliationValue === null ? "Montant invalide." : null}
      />
      <Textarea containerClassName="sm:col-span-2" label="Description (IPFS)" placeholder="Équipements, horaires, adresse…" value={description} onChange={(e) => setDescription(e.target.value)} disabled={ipfsMissing} />
      <div className="sm:col-span-2">
        <FileInput label="Photo (IPFS)" accept="image/*" file={photo} onChange={setPhoto} icon={ImageIcon} disabled={ipfsMissing} />
      </div>
      {ipfsMissing && (
        <div className="sm:col-span-2">
          <IpfsMissingAlert />
        </div>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" icon={Save} loading={busy} disabled={!canWrite || !valid} fullWidth>
          {ipfsMissing ? "Continuer sans fichier" : "Inscrire la salle"}
        </Button>
      </div>
    </form>
  );
}
