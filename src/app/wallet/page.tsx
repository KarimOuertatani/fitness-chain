import type { Metadata } from "next";
import { WalletView } from "@/components/wallet/WalletView";

export const metadata: Metadata = { title: "Portefeuille" };

export default function WalletPage() {
  return <WalletView />;
}
