/**
 * POST /api/ipfs — envoie un fichier (multipart, champ « file ») vers Pinata.
 *
 * Ce n'est PAS un backend métier : cette route sert uniquement à garder PINATA_JWT
 * côté serveur. Toute la logique de Fitness Chain reste dans les smart contracts.
 */
const PINATA_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

function gatewayUrl(cid: string): string {
  const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/";
  return `${gateway.endsWith("/") ? gateway : `${gateway}/`}${cid}`;
}

export async function POST(request: Request) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return Response.json(
      { error: "Stockage IPFS non configuré : ajoutez PINATA_JWT dans frontend/.env.local." },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Requête invalide : envoyez un formulaire multipart." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return Response.json({ error: "Aucun fichier reçu (champ « file »)." }, { status: 400 });
  }
  if (file.size === 0) {
    return Response.json({ error: "Le fichier est vide." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "Fichier trop volumineux (10 Mo maximum)." }, { status: 413 });
  }

  const fileName = file instanceof File && file.name ? file.name : "fichier";
  const body = new FormData();
  body.append("file", file, fileName);
  body.append("pinataMetadata", JSON.stringify({ name: `fitness-chain/${fileName}` }));

  try {
    const response = await fetch(PINATA_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body,
    });
    if (!response.ok) {
      const details = await response.text().catch(() => "");
      console.error("Erreur Pinata", response.status, details);
      return Response.json({ error: `Pinata a refusé l'envoi (HTTP ${response.status}).` }, { status: 502 });
    }
    const data = (await response.json()) as { IpfsHash?: string };
    if (!data.IpfsHash) {
      return Response.json({ error: "Réponse Pinata inattendue." }, { status: 502 });
    }
    return Response.json({ cid: data.IpfsHash, url: gatewayUrl(data.IpfsHash) });
  } catch (error) {
    console.error("Erreur réseau Pinata", error);
    return Response.json({ error: "Impossible de joindre Pinata." }, { status: 502 });
  }
}
