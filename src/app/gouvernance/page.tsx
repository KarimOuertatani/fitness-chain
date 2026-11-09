import type { Metadata } from "next";
import { GovernanceView } from "@/components/gouvernance/GovernanceView";

export const metadata: Metadata = { title: "Gouvernance" };

export default function GouvernancePage() {
  return <GovernanceView />;
}
