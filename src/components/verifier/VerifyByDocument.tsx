"use client";

import { useState, type DragEvent } from "react";
import { FileUp, FileText } from "lucide-react";
import { toast } from "sonner";
import { useContractData } from "@/hooks/useContractData";
import { getContract, CERTIFICATE_CONTRACTS } from "@/lib/contracts";
import { hashFile } from "@/lib/hash";
import { translateError } from "@/lib/errors";
import { readCertificateResult } from "@/lib/reads";
import { CertStatus } from "@/types";
import { cn } from "@/lib/utils";
import { CertificateResult } from "@/components/shared/CertificateResult";
import { ErrorState } from "@/components/shared/ErrorState";
import { Skeleton, Spinner } from "@/components/ui";

/** Dépôt d'un PDF : hash calculé dans le navigateur puis verifyDocument. */
export function VerifyByDocument() {
  const [dragging, setDragging] = useState(false);
  const [hashing, setHashing] = useState(false);
  const [file, setFile] = useState<{ name: string; hash: string } | null>(null);

  const { data, loading, error, reload } = useContractData(
    async (provider) => {
      const [status, id] = (await getContract("CoachCertificate", provider).verifyDocument(file!.hash)) as [bigint, bigint];
      if (Number(status) === CertStatus.NotFound || BigInt(id) === 0n) {
        return { status: CertStatus.NotFound, certificate: null };
      }
      const result = await readCertificateResult(provider, BigInt(id));
      return { ...result, status: Number(status) as CertStatus };
    },
    ["verify-document", file?.hash],
    { enabled: !!file, requires: CERTIFICATE_CONTRACTS }
  );

  const handle = async (f: File | undefined) => {
    if (!f) return;
    if (f.type && f.type !== "application/pdf") {
      toast.error("Déposez un fichier PDF.");
      return;
    }
    setHashing(true);
    try {
      setFile({ name: f.name, hash: await hashFile(f) });
    } catch (e) {
      toast.error(translateError(e));
    } finally {
      setHashing(false);
    }
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    void handle(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="flex flex-col gap-5">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-6 py-10 text-center transition",
          dragging ? "border-cyan bg-cyan/10" : "border-border-strong bg-white/[0.03] hover:border-cyan/60"
        )}
      >
        {hashing ? <Spinner className="size-8" /> : <FileUp className="size-10 text-cyan" aria-hidden />}
        <span className="font-semibold text-white">Déposez le PDF du diplôme ici</span>
        <span className="text-sm text-muted">ou cliquez pour choisir un fichier. Le fichier ne quitte jamais votre navigateur.</span>
        <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => void handle(e.target.files?.[0])} />
      </label>

      {file && (
        <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-border p-3">
          <FileText className="mt-0.5 size-5 shrink-0 text-subtle" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{file.name}</p>
            <p className="font-mono text-xs break-all text-subtle">{file.hash}</p>
          </div>
        </div>
      )}

      {file && (loading ? <Skeleton className="h-80 rounded-3xl" /> : error ? <ErrorState message={error} onRetry={reload} /> : data ? <CertificateResult result={data} /> : null)}
    </div>
  );
}
