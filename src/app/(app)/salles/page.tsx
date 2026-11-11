import type { Metadata } from "next";
import { GymDirectory } from "@/components/salles/GymDirectory";

export const metadata: Metadata = { title: "Salles" };

export default function SallesPage() {
  return <GymDirectory />;
}
