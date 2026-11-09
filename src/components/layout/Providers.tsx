"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { WalletProvider } from "@/hooks/useWallet";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      {children}
      <Toaster
        theme="dark"
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: "rgba(21, 27, 59, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(16px)",
            borderRadius: "1rem",
          },
        }}
      />
    </WalletProvider>
  );
}
