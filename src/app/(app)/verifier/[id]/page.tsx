import type { Metadata } from "next";
import { VerifierIdView } from "@/components/verifier/VerifierIdView";

export async function generateMetadata(props: PageProps<"/verifier/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: `Certificat n°${id}` };
}

export default async function VerifierIdPage(props: PageProps<"/verifier/[id]">) {
  const { id } = await props.params;
  return <VerifierIdView id={id} />;
}
