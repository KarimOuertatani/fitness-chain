"use client";

import { useState } from "react";
import { FileCheck2, FileText } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";
import { useTx } from "@/hooks/useTx";
import { useIpfsUpload } from "@/hooks/useIpfsUpload";
import { getContract, getReadProvider } from "@/lib/contracts";
import { hashFile } from "@/lib/hash";
import { translateError } from "@/lib/errors";
import { shortAddress } from "@/lib/format";
import { CertStatus, type TrainingRequest } from "@/types";
import { IpfsMissingAlert } from "@/components/shared/IpfsMissingAlert";
import { Alert, Button, FileInput, InfoRow, Modal } from "@/components/ui";

/**
 * « Valider la réussite » : PDF du diplôme → hash keccak256 → envoi IPFS → completeTraining.
 */
export function CompleteTrainingModal({
  request,
  trainingTitle,
  centerName,
  onClose,
}: {
  request: TrainingRequest;
  trainingTitle: string;
  centerName: string;
  onClose: () => void;
}) {
  const { canWrite, readProvider } = useWallet();
  const { run, pending } = useTx();
  const { uploadMetadata, ipfsMissing, uploading } = useIpfsUpload();
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [hashing, setHashing] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const busy = pending || uploading || hashing;

  const onFile = async (f: File | null) => {
    setFile(f);
    setHash(null);
    setDuplicate(false);
    if (!f) return;
    setHashing(true);
    try {
      const h = await hashFile(f);
      setHash(h);
      const provider = readProvider ?? getReadProvider();
      if (provider) {
        const [status] = (await getContract("CoachCertificate", provider).verifyDocument(h)) as [bigint, bigint];
        setDuplicate(Number(status) !== CertStatus.NotFound);
      }
    } catch (error) {
      toast.error(translateError(error));
    } finally {
      setHashing(false);
    }
  };

  const submit = async () => {
    if (!file || !hash || duplicate) return;
    try {
      const tokenUri = await uploadMetadata({
        metadata: {
          name: `Certificat — ${trainingTitle}`,
          description: `Certificat délivré par ${centerName || "le centre"} au coach ${request.coach}.`,
        },
        document: file,
      });
      if (tokenUri === null) return; // IPFS absent : confirmation demandée
      const receipt = await run(
        (signer) => getContract("CoachCertificate", signer).completeTraining(request.id, hash, tokenUri),
        { success: "Certificat émis : le NFT a été envoyé au coach et le paiement vous a été versé." }
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
      title="Valider la réussite"
      description="Le PDF du diplôme est haché dans votre navigateur ; seule son empreinte est enregistrée on-chain."
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button icon={FileCheck2} loading={busy} disabled={!canWrite || !hash || duplicate} onClick={() => void submit()}>
            {ipfsMissing ? "Émettre sans fichier IPFS" : "Émettre le certificat"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-white/[0.04] px-4 py-2">
          <InfoRow label="Formation" value={trainingTitle} />
          <InfoRow label="Coach" value={<span className="font-mono">{shortAddress(request.coach, 6)}</span>} />
          <InfoRow label="Demande" value={`n°${request.id.toString()}`} />
        </div>
        <FileInput label="Diplôme (PDF)" accept="application/pdf" file={file} onChange={(f) => void onFile(f)} icon={FileText} disabled={busy} />
        {hash && (
          <div className="rounded-2xl border border-border p-3">
            <p className="text-xs text-subtle">Empreinte keccak256</p>
            <p className="mt-1 font-mono text-xs break-all text-white">{hash}</p>
          </div>
        )}
        {duplicate && (
          <Alert tone="danger" title="Document déjà utilisé">
            Ce fichier correspond déjà à un certificat existant. Chaque diplôme doit être unique.
          </Alert>
        )}
        {ipfsMissing && <IpfsMissingAlert />}
      </div>
    </Modal>
  );
}
