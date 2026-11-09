import type { Metadata } from "next";
import { CoachView } from "@/components/coach/CoachView";

export const metadata: Metadata = { title: "Espace coach" };

export default function CoachPage() {
  return <CoachView />;
}
