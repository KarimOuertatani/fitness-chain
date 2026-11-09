"use client";

import { useState } from "react";
import { CalendarClock, Coins, ImageIcon, Save, Type } from "lucide-react";
import { toast } from "sonner";
import { useTx } from "@/hooks/useTx";
import { useWallet } from "@/hooks/useWallet";
import { useIpfsUpload } from "@/hooks/useIpfsUpload";
import { useMetadata } from "@/hooks/useMetadata";
import { getContract } from "@/lib/contracts";
import { formatUnits } from "ethers";
import { tryParseFTC } from "@/lib/format";
import { translateError } from "@/lib/errors";
import type { Training } from "@/types";
import { IpfsMissingAlert } from "@/components/shared/IpfsMissingAlert";
import { Button, Checkbox, FileInput, Input, Modal, Textarea } from "@/components/ui";

function toPositiveInt(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n <= 4_294_967_295 ? n : null;
}

/** Création (training absent) ou modification d'une formation. */
export function TrainingFormModal({ open, onClose, training }: { open: boolean; onClose: () => void; training?: Training }) {
  const editing = !!training;
  const { canWrite } = useWallet();
  const { run, pending } = useTx();
  const { uploadMetadata, ipfsMissing, uploading, reset } = useIpfsUpload();
  const { metadata } = useMetadata(training?.metadataURI);

  const [title, setTitle] = useState(training?.title ?? "");
  const [price, setPrice] = useState(training ? formatUnits(training.price, 18).replace(/\.0$/, "") : "");
  const [duration, setDuration] = useState(training ? String(training.durationDays) : "30");
  const [validity, setValidity] = useState(training ? String(training.validityDays) : "730");
  const [description, setDescription] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [active, setActive] = useState(training?.active ?? true);

  const currentDescription = description ?? metadata?.description ?? "";
  const priceValue = tryParseFTC(price);
  const durationValue = toPositiveInt(duration);
  const validityValue = toPositiveInt(validity);
  const valid = (editing || title.trim().length > 0) && priceValue !== null && durationValue !== null && validityValue !== null;
  const busy = pending || uploading;

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const submit = async () => {
    if (!valid || priceValue === null || durationValue === null || validityValue === null) return;
    try {
      // Métadonnées : inchangées en modification si ni la description ni l'image ne changent
      let uri = training?.metadataURI ?? "";
      const metadataChanged = !editing || description !== null || image !== null;
      if (metadataChanged && (currentDescription.trim() || image || editing)) {
        const result = await uploadMetadata({
          metadata: {
            name: editing ? training.title : title.trim(),
            description: currentDescription.trim(),
            ...(metadata?.image && !image ? { image: metadata.image } : {}),
          },
          image,
        });
        if (result === null) return; // IPFS absent : l'utilisateur confirme en recliquant
        // "" : l'utilisateur continue sans IPFS → en modification, on garde l'URI existante
        uri = result === "" && editing ? training.metadataURI : result;
      }

      const receipt = editing
        ? await run((signer) => getContract("CoachCertificate", signer).updateTraining(training.id, priceValue, uri, active), {
            success: "Formation mise à jour.",
          })
        : await run(
            (signer) =>
              getContract("CoachCertificate", signer).createTraining(title.trim(), priceValue, durationValue, validityValue, uri),
            { success: "Formation créée." }
          );
      if (receipt) {
        reset();
        onClose();
      }
    } catch (error) {
      toast.error(translateError(error));
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      dismissible={!busy}
      title={editing ? `Modifier « ${training.title} »` : "Nouvelle formation"}
      description={editing ? "Les demandes déjà payées ne sont pas affectées par la modification." : "La formation sera visible dans le catalogue des coachs."}
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close} disabled={busy}>
            Annuler
          </Button>
          <Button icon={Save} loading={busy} disabled={!canWrite || !valid} onClick={() => void submit()}>
            {ipfsMissing ? "Continuer sans fichier" : editing ? "Enregistrer" : "Créer la formation"}
          </Button>
        </div>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {!editing && (
          <Input
            containerClassName="sm:col-span-2"
            label="Intitulé"
            placeholder="Préparateur physique N1"
            icon={Type}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
        )}
        <Input
          label="Prix"
          inputMode="decimal"
          icon={Coins}
          suffix="FTC"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          error={price && priceValue === null ? "Prix invalide." : null}
        />
        <Input
          label="Durée (jours)"
          inputMode="numeric"
          icon={CalendarClock}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          disabled={editing}
          hint={editing ? "Non modifiable." : undefined}
          error={duration && durationValue === null ? "Nombre de jours invalide." : null}
        />
        <Input
          label="Validité du certificat (jours)"
          inputMode="numeric"
          icon={CalendarClock}
          value={validity}
          onChange={(e) => setValidity(e.target.value)}
          disabled={editing}
          hint={editing ? "Non modifiable." : "0 = sans expiration"}
          error={validity && validityValue === null ? "Nombre de jours invalide." : null}
        />
        <FileInput label="Image (IPFS)" accept="image/*" file={image} onChange={setImage} icon={ImageIcon} disabled={ipfsMissing} />
        <Textarea
          containerClassName="sm:col-span-2"
          label="Description (IPFS)"
          placeholder="Programme, prérequis, modalités d'évaluation…"
          value={currentDescription}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          disabled={ipfsMissing}
        />
        {editing && (
          <div className="sm:col-span-2">
            <Checkbox
              label="Formation active"
              description="Une formation inactive n'apparaît plus dans le catalogue et ne peut plus être demandée."
              checked={active}
              onChange={setActive}
            />
          </div>
        )}
        {ipfsMissing && (
          <div className="sm:col-span-2">
            <IpfsMissingAlert />
          </div>
        )}
      </form>
    </Modal>
  );
}
