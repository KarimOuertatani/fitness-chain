"use client";

import { CERTIFICATE_CONTRACTS } from "@/lib/contracts";
import { useState } from "react";
import { FileUp, Hash, QrCode, Search } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";
import { Button, Card, Input, PageHeader, TabPanel, Tabs } from "@/components/ui";
import { NotDeployedState } from "@/components/shared/NotDeployedState";
import { QrScanner } from "@/components/verifier/QrScanner";
import { VerifyByDocument } from "@/components/verifier/VerifyByDocument";
import { VerifyResultLoader } from "@/components/verifier/VerifyResultLoader";

type Mode = "id" | "qr" | "pdf";

/** Extrait l'identifiant d'un certificat d'un QR code (URL …/verifier/12 ou « 12 »). */
function parseCertificateId(text: string): bigint | null {
  const trimmed = text.trim();
  const fromUrl = trimmed.match(/\/verifier\/(\d+)(?:[/?#]|$)/);
  const raw = fromUrl?.[1] ?? (/^\d+$/.test(trimmed) ? trimmed : null);
  if (!raw) return null;
  const id = BigInt(raw);
  return id > 0n ? id : null;
}

export function VerifierView() {
  const { isAvailable } = useWallet();
  const deployed = isAvailable(CERTIFICATE_CONTRACTS);
  const [mode, setMode] = useState<Mode>("id");
  const [input, setInput] = useState("");
  const [id, setId] = useState<bigint | null>(null);
  const [scannedId, setScannedId] = useState<bigint | null>(null);

  const inputId = /^\d+$/.test(input.trim()) && BigInt(input.trim()) > 0n ? BigInt(input.trim()) : null;

  return (
    <>
      <PageHeader
        title="Vérifier un certificat"
        subtitle="Contrôlez l'authenticité d'un certificat de coach directement sur la blockchain. Aucun wallet n'est nécessaire."
      />
      {!deployed ? (
        <NotDeployedState what="les certificats" />
      ) : (
        <div className="mx-auto flex w-full max-w-3xl flex-col">
          <Tabs<Mode>
            label="Mode de vérification"
            active={mode}
            onChange={setMode}
            className="self-center"
            tabs={[
              { key: "id", label: "Saisir un ID", icon: Hash },
              { key: "qr", label: "Scanner un QR", icon: QrCode },
              { key: "pdf", label: "Déposer un PDF", icon: FileUp },
            ]}
          />
          <TabPanel className="flex flex-col gap-5">
            {mode === "id" && (
              <>
                <Card>
                  <form
                    className="flex flex-col gap-3 sm:flex-row sm:items-end"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (inputId) setId(inputId);
                    }}
                  >
                    <Input
                      containerClassName="flex-1"
                      label="Identifiant du certificat"
                      inputMode="numeric"
                      placeholder="Ex. 1"
                      icon={Hash}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      error={input && !inputId ? "Saisissez un nombre entier supérieur à 0." : null}
                    />
                    <Button type="submit" icon={Search} disabled={!inputId}>
                      Vérifier
                    </Button>
                  </form>
                </Card>
                {id && <VerifyResultLoader id={id} />}
              </>
            )}

            {mode === "qr" && (
              <>
                {scannedId ? (
                  <Button variant="glass" icon={QrCode} onClick={() => setScannedId(null)} className="self-center">
                    Scanner un autre QR code
                  </Button>
                ) : (
                  <Card>
                    <QrScanner
                      onResult={(text) => {
                        const parsed = parseCertificateId(text);
                        if (parsed) setScannedId(parsed);
                        else toast.error("Ce QR code ne correspond pas à un certificat Fitness Chain.");
                      }}
                    />
                  </Card>
                )}
                {scannedId && <VerifyResultLoader id={scannedId} />}
              </>
            )}

            {mode === "pdf" && <VerifyByDocument />}
          </TabPanel>
        </div>
      )}
    </>
  );
}
