import type { Metadata } from "next";
import { GymDetail } from "@/components/salles/GymDetail";

export const metadata: Metadata = { title: "Salle" };

export default async function SalleDetailPage(props: PageProps<"/salles/[id]">) {
  const { id } = await props.params;
  return <GymDetail id={id} />;
}
