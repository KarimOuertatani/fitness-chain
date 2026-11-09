import type { Metadata } from "next";
import { SalleView } from "@/components/salle/SalleView";

export const metadata: Metadata = { title: "Ma salle" };

export default function SallePage() {
  return <SalleView />;
}
