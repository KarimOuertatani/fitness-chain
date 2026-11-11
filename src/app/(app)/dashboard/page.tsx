import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function DashboardPage() {
  return <Dashboard />;
}
