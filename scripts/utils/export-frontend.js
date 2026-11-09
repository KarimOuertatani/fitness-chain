const fs = require("fs");
const path = require("path");

const BLOCKCHAIN_DIR = path.resolve(__dirname, "..", "..");
const FRONTEND_CONFIG_DIR = path.resolve(BLOCKCHAIN_DIR, "..", "frontend", "src", "config");
const ADDRESSES_FILE = path.join(FRONTEND_CONFIG_DIR, "addresses.json");
const ABIS_DIR = path.join(FRONTEND_CONFIG_DIR, "abis");
const ARTIFACTS_DIR = path.join(BLOCKCHAIN_DIR, "artifacts", "contracts");

/**
 * Lit un fichier JSON ; renvoie `fallback` s'il n'existe pas ou est invalide.
 */
function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

/**
 * Écrit les adresses déployées et les ABI dans le frontend.
 *
 * - `frontend/src/config/addresses.json` : fusion par chainId, sans écraser les autres réseaux.
 *   L'entrée du réseau déployé est remplacée (évite de garder des adresses d'un ancien nœud).
 * - `frontend/src/config/abis/<Nom>.json` : uniquement le champ `abi` de l'artefact compilé.
 *
 * @param {number|string|bigint} chainId identifiant du réseau
 * @param {Record<string, string>} addresses ex. { FitCoin: "0x…", CenterDAO: "0x…" }
 */
function exportToFrontend(chainId, addresses) {
  const key = chainId.toString();

  fs.mkdirSync(FRONTEND_CONFIG_DIR, { recursive: true });
  fs.mkdirSync(ABIS_DIR, { recursive: true });

  // 1. Adresses (fusion)
  const all = readJson(ADDRESSES_FILE, {});
  all[key] = { ...addresses };
  fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(all, null, 2) + "\n");
  console.log(`✔ Adresses écrites dans ${path.relative(process.cwd(), ADDRESSES_FILE)} (réseau ${key})`);

  // 2. ABI
  for (const name of Object.keys(addresses)) {
    const artifactFile = path.join(ARTIFACTS_DIR, `${name}.sol`, `${name}.json`);
    if (!fs.existsSync(artifactFile)) {
      console.warn(`⚠ Artefact introuvable pour ${name} (${artifactFile}) : ABI non copié.`);
      continue;
    }
    const { abi } = readJson(artifactFile, {});
    if (!Array.isArray(abi)) {
      console.warn(`⚠ Artefact invalide pour ${name} : ABI non copié.`);
      continue;
    }
    fs.writeFileSync(path.join(ABIS_DIR, `${name}.json`), JSON.stringify(abi, null, 2) + "\n");
    console.log(`✔ ABI de ${name} copié dans le frontend`);
  }
}

module.exports = { exportToFrontend, ADDRESSES_FILE };
