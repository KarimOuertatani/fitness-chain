import type { Metadata } from "next";
import { VerifierView } from "@/components/verifier/VerifierView";

export const metadata: Metadata = { title: "Vérifier un certificat" };

export default function VerifierPage() {
  return <VerifierView />;
}
