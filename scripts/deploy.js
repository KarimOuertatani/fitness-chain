/**
 * Déploiement des contrats Fitness Chain (ordre de la section 9.6 de docs/SPEC.md).
 * Seuls les contrats déjà écrits sont déployés ; les autres (ou ceux dont une
 * dépendance manque) sont ignorés sans erreur.
 *
 *   npm run deploy:local     (réseau localhost, nœud Hardhat lancé avec `npm run node`)
 *   npm run deploy:sepolia   (réseau Sepolia, variables du fichier .env)
 *
 * Sur Sepolia, les centres fondateurs peuvent être fournis via :
 *   FOUNDERS=0xabc…,0xdef…
 *   FOUNDER_NAMES=Centre Alpha,Centre Beta
 * Sinon, le déployeur est le seul fondateur.
 */
const hre = require("hardhat");
const { exportToFrontend } = require("./utils/export-frontend");

const { ethers, network } = hre;

const LOCAL_CHAIN_IDS = [31337n];
const CONTRACTS = ["FitCoin", "CenterDAO", "CoachCertificate", "GymManager", "RewardManager"];
const ONE_DAY = 24 * 60 * 60;

function parseList(value) {
  return (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function resolveFounders(signers, isLocal) {
  const deployer = signers[0];

  if (isLocal) {
    if (signers.length < 4) {
      throw new Error("Il faut au moins 4 comptes en local (déployeur + 3 centres fondateurs).");
    }
    return {
      founders: [signers[1].address, signers[2].address, signers[3].address],
      names: ["Centre Alpha", "Centre Beta", "Centre Gamma"],
    };
  }

  const founders = parseList(process.env.FOUNDERS);
  if (founders.length === 0) {
    return { founders: [deployer.address], names: ["Centre Fondateur"] };
  }

  for (const addr of founders) {
    if (!ethers.isAddress(addr)) {
      throw new Error(`Adresse fondatrice invalide dans FOUNDERS : ${addr}`);
    }
  }

  let names = parseList(process.env.FOUNDER_NAMES);
  if (names.length === 0) {
    names = founders.map((_, i) => `Centre ${i + 1}`);
  }
  if (names.length !== founders.length) {
    throw new Error(
      `FOUNDERS (${founders.length}) et FOUNDER_NAMES (${names.length}) doivent avoir le même nombre d'éléments.`
    );
  }

  return { founders: founders.map((a) => ethers.getAddress(a)), names };
}

async function deployContract(name, args = []) {
  console.log(`→ Déploiement de ${name}…`);
  const factory = await ethers.getContractFactory(name);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`  ${name} déployé à ${address}`);
  return { contract, address };
}

async function main() {
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("Aucun compte disponible. Vérifiez PRIVATE_KEY dans le fichier .env.");
  }
  const deployer = signers[0];
  const { chainId } = await ethers.provider.getNetwork();
  const isLocal = LOCAL_CHAIN_IDS.includes(chainId);

  console.log("==============================================");
  console.log(" Déploiement de Fitness Chain");
  console.log("==============================================");
  console.log(`Réseau     : ${network.name} (chainId ${chainId})`);
  console.log(`Déployeur  : ${deployer.address}`);
  console.log(`Solde      : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  const { founders, names } = await resolveFounders(signers, isLocal);
  const votingPeriod = isLocal ? 300 : 3 * ONE_DAY;

  console.log("Centres fondateurs :");
  founders.forEach((addr, i) => console.log(`  - ${names[i]} : ${addr}`));
  console.log(`Période de vote : ${votingPeriod} secondes\n`);

  // Seuls les contrats déjà écrits (artefact compilé présent) sont déployés.
  const available = {};
  for (const name of CONTRACTS) {
    available[name] = await hre.artifacts.artifactExists(name);
  }
  const addresses = {};
  const skipped = [];

  /** Déploie `name` si son artefact existe et si ses dépendances sont déployées. */
  async function deployIfReady(name, dependencies, buildArgs) {
    if (!available[name]) {
      skipped.push(`${name} (contrat pas encore écrit)`);
      return null;
    }
    const missing = dependencies.filter((dep) => !addresses[dep]);
    if (missing.length > 0) {
      skipped.push(`${name} (dépend de ${missing.join(", ")})`);
      return null;
    }
    const deployed = await deployContract(name, buildArgs());
    addresses[name] = deployed.address;
    return deployed;
  }

  // 1. FitCoin
  const fitCoin = await deployIfReady("FitCoin", [], () => []);

  // 2. CenterDAO
  await deployIfReady("CenterDAO", [], () => [founders, names, votingPeriod]);

  // 3. CoachCertificate
  await deployIfReady("CoachCertificate", ["CenterDAO", "FitCoin"], () => [addresses.CenterDAO, addresses.FitCoin]);

  // 4. GymManager
  await deployIfReady("GymManager", ["FitCoin", "CoachCertificate"], () => [addresses.FitCoin, addresses.CoachCertificate]);

  // 5. RewardManager
  const welcomeBonus = ethers.parseUnits("50", 18);
  const dailyReward = ethers.parseUnits("2", 18);
  const streakBonus = ethers.parseUnits("10", 18);
  const streakLength = 7;
  const rewardManager = await deployIfReady("RewardManager", ["FitCoin", "GymManager"], () => [
    addresses.FitCoin,
    addresses.GymManager,
    welcomeBonus,
    dailyReward,
    streakBonus,
    streakLength,
  ]);

  // 6. Autoriser RewardManager à créer des FTC
  if (fitCoin && rewardManager) {
    console.log("→ Autorisation de RewardManager comme minter de FitCoin…");
    const tx = await fitCoin.contract.setMinter(rewardManager.address, true);
    await tx.wait();
    console.log("  RewardManager est maintenant minter\n");
  }

  if (Object.keys(addresses).length === 0) {
    throw new Error("Aucun contrat à déployer : écrivez et compilez au moins un contrat.");
  }

  if (skipped.length > 0) {
    console.log("\nContrats ignorés :");
    skipped.forEach((s) => console.log(`  - ${s}`));
    console.log("");
  }

  console.log("Récapitulatif des adresses :");
  console.table(Object.entries(addresses).map(([contrat, adresse]) => ({ contrat, adresse })));

  exportToFrontend(chainId, addresses);

  console.log("\n✅ Déploiement terminé.");
}

main().catch((error) => {
  console.error("❌ Échec du déploiement :", error);
  process.exitCode = 1;
});
