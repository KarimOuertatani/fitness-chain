import type { Metadata } from "next";
import { RewardsView } from "@/components/recompenses/RewardsView";

export const metadata: Metadata = { title: "Récompenses" };

export default function RecompensesPage() {
  return <RewardsView />;
}
