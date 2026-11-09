/**
 * Scénario de démonstration Fitness Chain (réseau local uniquement).
 *
 *   npm run node        (terminal 1)
 *   npm run deploy:local
 *   npm run seed:local
 *
 * Comptes Hardhat utilisés :
 *   0 : déployeur
 *   1, 2, 3 : Centre Alpha, Centre Beta, Centre Gamma (fondateurs)
 *   4 : Sport Academy (nouveau centre)
 *   5 : Ali (coach)
 *   6 : Sami (adhérent)
 *   7 : propriétaire d'Iron Gym
 */
const fs = require("fs");
const hre = require("hardhat");
const { ADDRESSES_FILE } = require("./utils/export-frontend");

const { ethers } = hre;
const ftc = (value) => ethers.parseUnits(value, 18);
const fmt = (value) => `${ethers.formatUnits(value, 18)} FTC`;

let stepNumber = 0;
function step(title) {
  stepNumber += 1;
  console.log(`\n━━━ Étape ${stepNumber} : ${title} ━━━`);
}

function info(message) {
  console.log(`  • ${message}`);
}

async function send(label, txPromise) {
  const tx = await txPromise;
  const receipt = await tx.wait();
  info(`${label} ✔`);
  return receipt;
}

/** Récupère un argument d'un événement émis par `contract` dans un reçu. */
function eventArg(receipt, contract, eventName, argName) {
  for (const log of receipt.logs) {
    let parsed;
    try {
      parsed = contract.interface.parseLog(log);
    } catch {
      continue;
    }
    if (parsed && parsed.name === eventName) {
      return parsed.args[argName];
    }
  }
  throw new Error(`Événement ${eventName} introuvable dans la transaction.`);
}

async function loadAddresses(chainId) {
  if (!fs.existsSync(ADDRESSES_FILE)) {
    throw new Error("frontend/src/config/addresses.json introuvable. Lancez d'abord `npm run deploy:local`.");
  }
  const all = JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
  const addresses = all[chainId.toString()];
  const required = ["FitCoin", "CenterDAO", "CoachCertificate", "GymManager", "RewardManager"];
  if (!addresses || required.some((name) => !addresses[name])) {
    throw new Error(`Adresses manquantes pour le réseau ${chainId}. Lancez d'abord \`npm run deploy:local\`.`);
  }
  for (const name of required) {
    const code = await ethers.provider.getCode(addresses[name]);
    if (code === "0x") {
      throw new Error(
        `Aucun contrat ${name} à ${addresses[name]}. Le nœud a sans doute été redémarré : relancez \`npm run deploy:local\`.`
      );
    }
  }
  return addresses;
}

async function main() {
  const { chainId } = await ethers.provider.getNetwork();
  if (chainId !== 31337n) {
    throw new Error("Ce script de démonstration est réservé au réseau local (chainId 31337).");
  }

  const signers = await ethers.getSigners();
  if (signers.length < 8) {
    throw new Error("Il faut au moins 8 comptes Hardhat pour la démonstration.");
  }
  const [, alpha, beta, gamma, sportAcademy, ali, sami, ironGymOwner] = signers;

  const addresses = await loadAddresses(chainId);
  const fitCoin = await ethers.getContractAt("FitCoin", addresses.FitCoin);
  const dao = await ethers.getContractAt("CenterDAO", addresses.CenterDAO);
  const certificate = await ethers.getContractAt("CoachCertificate", addresses.CoachCertificate);
  const gymManager = await ethers.getContractAt("GymManager", addresses.GymManager);
  const rewardManager = await ethers.getContractAt("RewardManager", addresses.RewardManager);

  console.log("==============================================");
  console.log(" Démonstration Fitness Chain");
  console.log("==============================================");

  // 1. La DAO accepte Sport Academy
  step("la DAO accepte « Sport Academy »");
  const proposeReceipt = await send(
    "Centre Alpha propose Sport Academy",
    dao.connect(alpha).proposeAdd(sportAcademy.address, "Sport Academy")
  );
  const proposalId = eventArg(proposeReceipt, dao, "ProposalCreated", "id");
  info(`Proposition n°${proposalId} créée`);
  await send("Centre Alpha vote oui", dao.connect(alpha).vote(proposalId, true));
  await send("Centre Beta vote oui", dao.connect(beta).vote(proposalId, true));
  await send("Exécution de la proposition", dao.connect(gamma).execute(proposalId));
  info(`Sport Academy est un centre agréé : ${await dao.isActiveCenter(sportAcademy.address)}`);

  // 2. Achat de FTC
  step("achat de FitCoin");
  await send("Ali achète 300 FTC pour 0,03 ETH", fitCoin.connect(ali).buyTokens({ value: ethers.parseEther("0.03") }));
  await send("Sami achète 200 FTC pour 0,02 ETH", fitCoin.connect(sami).buyTokens({ value: ethers.parseEther("0.02") }));
  info(`Solde d'Ali : ${fmt(await fitCoin.balanceOf(ali.address))}`);
  info(`Solde de Sami : ${fmt(await fitCoin.balanceOf(sami.address))}`);

  // 3. Création d'une formation
  step("Sport Academy crée la formation « Préparateur physique N1 »");
  const trainingPrice = ftc("200");
  const trainingReceipt = await send(
    "Formation créée (200 FTC, 30 jours, validité 730 jours)",
    certificate.connect(sportAcademy).createTraining("Préparateur physique N1", trainingPrice, 30, 730, "")
  );
  const trainingId = eventArg(trainingReceipt, certificate, "TrainingCreated", "trainingId");
  info(`Formation n°${trainingId}`);

  // 4. Demande, acceptation et validation
  step("Ali suit la formation et obtient son certificat");
  await send(
    "Ali autorise CoachCertificate à prélever 200 FTC",
    fitCoin.connect(ali).approve(addresses.CoachCertificate, trainingPrice)
  );
  const requestReceipt = await send(
    "Ali demande la formation (200 FTC en séquestre)",
    certificate.connect(ali).requestTraining(trainingId)
  );
  const requestId = eventArg(requestReceipt, certificate, "TrainingRequested", "requestId");
  info(`Demande n°${requestId}`);
  await send("Sport Academy accepte la demande", certificate.connect(sportAcademy).acceptRequest(requestId));
  const documentHash = ethers.id("diplome-ali.pdf");
  const completeReceipt = await send(
    "Sport Academy valide la réussite d'Ali",
    certificate.connect(sportAcademy).completeTraining(requestId, documentHash, "")
  );
  const certificateId = eventArg(completeReceipt, certificate, "CertificateIssued", "certificateId");
  info(`Certificat n°${certificateId} émis (hash ${documentHash})`);
  info(`Ali a un certificat valide : ${await certificate.hasValidCertificate(ali.address)}`);

  // 5. Inscription de la salle
  step("inscription de la salle « Iron Gym »");
  const monthlyFee = ftc("30");
  const affiliationFee = ftc("40");
  const gymReceipt = await send(
    "Iron Gym inscrite (30 FTC/mois, affiliation 40 FTC)",
    gymManager.connect(ironGymOwner).registerGym("Iron Gym", monthlyFee, affiliationFee, "")
  );
  const gymId = eventArg(gymReceipt, gymManager, "GymRegistered", "gymId");
  info(`Salle n°${gymId}`);

  // 6. Candidature d'Ali
  step("Ali rejoint Iron Gym comme coach");
  const coachingPrice = ftc("20");
  await send(
    "Ali autorise GymManager à prélever 40 FTC",
    fitCoin.connect(ali).approve(addresses.GymManager, affiliationFee)
  );
  const applyReceipt = await send(
    "Ali postule (coaching 20 FTC/mois)",
    gymManager.connect(ali).applyToGym(gymId, coachingPrice)
  );
  const applicationId = eventArg(applyReceipt, gymManager, "CoachApplied", "applicationId");
  info(`Candidature n°${applicationId}`);
  await send("Iron Gym accepte Ali", gymManager.connect(ironGymOwner).acceptCoach(applicationId));

  // 7. Abonnement de Sami et récompenses
  step("Sami s'abonne 2 mois avec Ali et réclame ses récompenses");
  const months = 2;
  const [total, gymPart, coachPart] = await gymManager.quote(gymId, ali.address, months);
  info(`Devis : salle ${fmt(gymPart)} + coach ${fmt(coachPart)} = ${fmt(total)}`);
  await send(
    `Sami autorise GymManager à prélever ${fmt(total)}`,
    fitCoin.connect(sami).approve(addresses.GymManager, total)
  );
  await send("Sami s'abonne", gymManager.connect(sami).subscribe(gymId, ali.address, months));
  const subscription = await gymManager.getSubscription(sami.address, gymId);
  info(`Abonnement valable jusqu'au ${new Date(Number(subscription.endTime) * 1000).toLocaleString("fr-FR")}`);
  await send("Sami réclame le bonus de bienvenue", rewardManager.connect(sami).claimWelcomeBonus());
  await send("Sami réclame la récompense du jour", rewardManager.connect(sami).claimDaily());

  // 8. Soldes finaux
  step("soldes finaux");
  const actors = [
    ["Centre Alpha", alpha],
    ["Centre Beta", beta],
    ["Centre Gamma", gamma],
    ["Sport Academy", sportAcademy],
    ["Ali (coach)", ali],
    ["Sami (adhérent)", sami],
    ["Iron Gym (propriétaire)", ironGymOwner],
  ];
  const rows = [];
  for (const [name, signer] of actors) {
    rows.push({ acteur: name, adresse: signer.address, solde: fmt(await fitCoin.balanceOf(signer.address)) });
  }
  console.table(rows);

  console.log("\n✅ Démonstration terminée.");
}

main().catch((error) => {
  console.error("❌ Échec de la démonstration :", error);
  process.exitCode = 1;
});
