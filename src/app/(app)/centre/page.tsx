import type { Metadata } from "next";
import { CentreView } from "@/components/centre/CentreView";

export const metadata: Metadata = { title: "Espace centre" };

export default function CentrePage() {
  return <CentreView />;
}
