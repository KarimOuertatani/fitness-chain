"use client";

import { useEffect, useEffectEvent, useId, useState } from "react";
import { CameraOff } from "lucide-react";
import { Alert, Spinner } from "@/components/ui";

/** Scanner de QR code (caméra) basé sur html5-qrcode. */
export function QrScanner({ onResult }: { onResult: (text: string) => void }) {
  const rawId = useId();
  const elementId = `qr-reader-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [status, setStatus] = useState<"starting" | "scanning" | "error">("starting");
  const [message, setMessage] = useState("");
  const emit = useEffectEvent((text: string) => onResult(text));

  useEffect(() => {
    let cancelled = false;
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    let started = false;

    const start = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        scanner = new Html5Qrcode(elementId, { verbose: false });
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => emit(decoded),
          () => {}
        );
        started = true;
        if (cancelled) {
          await scanner.stop().catch(() => {});
          return;
        }
        setStatus("scanning");
      } catch (error) {
        if (cancelled) return;
        const text = error instanceof Error ? error.message : String(error);
        setMessage(
          /permission|NotAllowed/i.test(text)
            ? "Accès à la caméra refusé. Autorisez la caméra dans votre navigateur."
            : /NotFound|no camera|Requested device not found/i.test(text)
              ? "Aucune caméra détectée sur cet appareil."
              : "Impossible de démarrer la caméra (une connexion HTTPS ou localhost est requise)."
        );
        setStatus("error");
      }
    };
    void start();

    return () => {
      cancelled = true;
      if (scanner && started) {
        void scanner
          .stop()
          .then(() => scanner?.clear())
          .catch(() => {});
      }
    };
  }, [elementId]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl border border-border-strong bg-black/40">
        <div id={elementId} className="size-full [&_video]:size-full [&_video]:object-cover" />
        {status === "starting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-muted">
            <Spinner />
            Démarrage de la caméra…
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center text-subtle">
            <CameraOff className="size-10" aria-hidden />
          </div>
        )}
      </div>
      {status === "error" && <Alert tone="warning">{message}</Alert>}
      {status === "scanning" && <p className="text-center text-sm text-muted">Placez le QR code du certificat dans le cadre.</p>}
    </div>
  );
}
