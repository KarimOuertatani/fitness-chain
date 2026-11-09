const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const ftc = (value) => ethers.parseUnits(value, 18);
const DAY = 24n * 60n * 60n;
const MONTH = 30n * DAY;

const WELCOME = ftc("50");
const DAILY = ftc("2");
const STREAK_BONUS = ftc("10");
const STREAK_LENGTH = 7n;

/** Avance au début du jour suivant + `offset` secondes. */
async function goToNextDay(offset = 3600n) {
  const now = BigInt(await time.latest());
  await time.increaseTo((now / DAY + 1n) * DAY + offset);
}

/** Jour courant (block.timestamp / 1 days) du prochain bloc. */
async function today() {
  return BigInt(await time.latest()) / DAY;
}

describe("RewardManager", function () {
  async function deployFixture() {
    const [deployer, alpha, beta, gamma, ali, gymOwner, sami, stranger] = await ethers.getSigners();

    const fitCoin = await (await ethers.getContractFactory("FitCoin")).deploy();
    const dao = await (await ethers.getContractFactory("CenterDAO")).deploy(
      [alpha.address, beta.address, gamma.address],
      ["Centre Alpha", "Centre Beta", "Centre Gamma"],
      300
    );
    const cert = await (await ethers.getContractFactory("CoachCertificate")).deploy(
      await dao.getAddress(),
      await fitCoin.getAddress()
    );
    const gm = await (await ethers.getContractFactory("GymManager")).deploy(
      await fitCoin.getAddress(),
      await cert.getAddress()
    );
    const RewardManager = await ethers.getContractFactory("RewardManager");
    const rewards = await RewardManager.deploy(
      await fitCoin.getAddress(),
      await gm.getAddress(),
      WELCOME,
      DAILY,
      STREAK_BONUS,
      STREAK_LENGTH
    );
    await fitCoin.setMinter(await rewards.getAddress(), true);

    // Achats de FTC et autorisations
    for (const s of [ali, sami, stranger]) {
      await fitCoin.connect(s).buyTokens({ value: ethers.parseEther("0.1") });
      await fitCoin.connect(s).approve(await gm.getAddress(), ethers.MaxUint256);
      await fitCoin.connect(s).approve(await cert.getAddress(), ethers.MaxUint256);
    }

    // Ali devient coach certifié d'Iron Gym
    await cert.connect(alpha).createTraining("Préparateur physique N1", ftc("200"), 30, 730, "");
    await cert.connect(ali).requestTraining(1);
    await cert.connect(alpha).acceptRequest(1);
    await cert.connect(alpha).completeTraining(1, ethers.id("diplome-ali.pdf"), "");
    await gm.connect(gymOwner).registerGym("Iron Gym", ftc("30"), ftc("40"), "");
    await gm.connect(ali).applyToGym(1, ftc("20"));
    await gm.connect(gymOwner).acceptCoach(1);

    // On démarre au début d'un jour UTC (+1 h) pour maîtriser les changements de jour
    await goToNextDay();

    return { fitCoin, gm, rewards, RewardManager, ali, gymOwner, sami, stranger };
  }

  /** Sami est abonné 3 mois à Iron Gym avec Ali (90 jours). */
  async function memberFixture() {
    const ctx = await deployFixture();
    await ctx.gm.connect(ctx.sami).subscribe(1, ctx.ali.address, 3);
    return ctx;
  }

  describe("Déploiement", function () {
    it("enregistre les montants du constructeur (50, 2, 10 FTC et 7 jours)", async function () {
      const { rewards } = await loadFixture(deployFixture);
      expect(await rewards.welcomeBonus()).to.equal(WELCOME);
      expect(await rewards.dailyReward()).to.equal(DAILY);
      expect(await rewards.streakBonus()).to.equal(STREAK_BONUS);
      expect(await rewards.streakLength()).to.equal(STREAK_LENGTH);
    });

    it("refuse une longueur de série nulle et des adresses nulles", async function () {
      const { RewardManager, fitCoin, gm } = await loadFixture(deployFixture);
      const fc = await fitCoin.getAddress();
      const g = await gm.getAddress();
      await expect(RewardManager.deploy(fc, g, WELCOME, DAILY, STREAK_BONUS, 0)).to.be.revertedWith(
        "RewardManager : la longueur de série doit être supérieure à 0"
      );
      await expect(RewardManager.deploy(ethers.ZeroAddress, g, WELCOME, DAILY, STREAK_BONUS, 7)).to.be.revertedWith(
        "RewardManager : adresse de FitCoin nulle"
      );
      await expect(RewardManager.deploy(fc, ethers.ZeroAddress, WELCOME, DAILY, STREAK_BONUS, 7)).to.be.revertedWith(
        "RewardManager : adresse de GymManager nulle"
      );
    });

    it("un nouvel utilisateur n'a encore rien gagné", async function () {
      const { rewards, sami } = await loadFixture(deployFixture);
      const info = await rewards.getRewardInfo(sami.address);
      expect(info.welcomeClaimed).to.equal(false);
      expect(info.lastClaimDay).to.equal(0n);
      expect(info.streak).to.equal(0n);
      expect(info.totalEarned).to.equal(0n);
      expect(await rewards.canClaimToday(sami.address)).to.equal(true);
      expect(await rewards.getStreak(sami.address)).to.equal(0n);
      expect(await rewards.nextClaimTime(sami.address)).to.equal(0n);
    });
  });

  describe("Accès réservé aux adhérents", function () {
    it("un utilisateur sans abonnement ne peut rien réclamer", async function () {
      const { rewards, stranger, ali } = await loadFixture(memberFixture);
      for (const s of [stranger, ali]) {
        await expect(rewards.connect(s).claimWelcomeBonus()).to.be.revertedWith(
          "RewardManager : un abonnement actif est requis pour être récompensé"
        );
        await expect(rewards.connect(s).claimDaily()).to.be.revertedWith(
          "RewardManager : un abonnement actif est requis pour être récompensé"
        );
      }
    });

    it("les FTC sont créés par FitCoin.mint (RewardManager doit être minter)", async function () {
      const { rewards, fitCoin, sami } = await loadFixture(memberFixture);
      const supply = await fitCoin.totalSupply();
      await rewards.connect(sami).claimWelcomeBonus();
      expect(await fitCoin.totalSupply()).to.equal(supply + WELCOME);

      await fitCoin.setMinter(await rewards.getAddress(), false);
      await expect(rewards.connect(sami).claimDaily()).to.be.revertedWith(
        "FitCoin : seul un minter peut créer des FTC"
      );
    });
  });

  describe("Bonus de bienvenue", function () {
    it("verse 50 FTC et émet WelcomeBonusClaimed", async function () {
      const { rewards, fitCoin, sami } = await loadFixture(memberFixture);
      const tx = rewards.connect(sami).claimWelcomeBonus();
      await expect(tx).to.emit(rewards, "WelcomeBonusClaimed").withArgs(sami.address, WELCOME);
      await expect(tx).to.changeTokenBalance(fitCoin, sami, WELCOME);
      const info = await rewards.getRewardInfo(sami.address);
      expect(info.welcomeClaimed).to.equal(true);
      expect(info.totalEarned).to.equal(WELCOME);
    });

    it("ne fonctionne qu'une seule fois", async function () {
      const { rewards, sami } = await loadFixture(memberFixture);
      await rewards.connect(sami).claimWelcomeBonus();
      await expect(rewards.connect(sami).claimWelcomeBonus()).to.be.revertedWith(
        "RewardManager : bonus de bienvenue déjà réclamé"
      );
      await goToNextDay();
      await expect(rewards.connect(sami).claimWelcomeBonus()).to.be.revertedWith(
        "RewardManager : bonus de bienvenue déjà réclamé"
      );
    });
  });

  describe("Récompense du jour", function () {
    it("verse 2 FTC et émet DailyRewardClaimed (jour, série 1, montant)", async function () {
      const { rewards, fitCoin, sami } = await loadFixture(memberFixture);
      const day = await today();
      const tx = rewards.connect(sami).claimDaily();
      await expect(tx).to.emit(rewards, "DailyRewardClaimed").withArgs(sami.address, day, 1n, DAILY);
      await expect(tx).to.changeTokenBalance(fitCoin, sami, DAILY);
      expect(await rewards.getStreak(sami.address)).to.equal(1n);
      const info = await rewards.getRewardInfo(sami.address);
      expect(info.lastClaimDay).to.equal(day);
      expect(info.totalEarned).to.equal(DAILY);
    });

    it("on ne peut réclamer qu'une fois par jour", async function () {
      const { rewards, sami } = await loadFixture(memberFixture);
      await rewards.connect(sami).claimDaily();
      expect(await rewards.canClaimToday(sami.address)).to.equal(false);
      await time.increase(10n * 60n * 60n); // 10 h plus tard, même jour
      await expect(rewards.connect(sami).claimDaily()).to.be.revertedWith(
        "RewardManager : récompense du jour déjà réclamée"
      );
    });

    it("nextClaimTime donne le début du jour suivant", async function () {
      const { rewards, sami } = await loadFixture(memberFixture);
      await rewards.connect(sami).claimDaily();
      const day = await today();
      expect(await rewards.nextClaimTime(sami.address)).to.equal((day + 1n) * DAY);

      await time.increaseTo((day + 1n) * DAY - 1n);
      expect(await rewards.canClaimToday(sami.address)).to.equal(false);
      await time.increaseTo((day + 1n) * DAY);
      expect(await rewards.canClaimToday(sami.address)).to.equal(true);
    });

    it("réclamer juste avant puis juste après minuit compte pour deux jours consécutifs", async function () {
      const { rewards, sami } = await loadFixture(memberFixture);
      const day = await today();
      await time.setNextBlockTimestamp((day + 1n) * DAY - 5n);
      await rewards.connect(sami).claimDaily();
      await time.setNextBlockTimestamp((day + 1n) * DAY + 5n);
      await rewards.connect(sami).claimDaily();
      expect(await rewards.getStreak(sami.address)).to.equal(2n);
    });
  });

  describe("Série", function () {
    it("la série augmente jour après jour et le 7e jour donne 2 + 10 FTC", async function () {
      const { rewards, fitCoin, sami } = await loadFixture(memberFixture);

      for (let i = 1n; i <= 6n; i++) {
        const tx = rewards.connect(sami).claimDaily();
        await expect(tx).to.changeTokenBalance(fitCoin, sami, DAILY);
        await expect(tx).not.to.emit(rewards, "StreakBonusAwarded");
        expect(await rewards.getStreak(sami.address)).to.equal(i);
        await goToNextDay();
      }

      const tx = rewards.connect(sami).claimDaily();
      await expect(tx).to.changeTokenBalance(fitCoin, sami, DAILY + STREAK_BONUS);
      await expect(tx).to.emit(rewards, "StreakBonusAwarded").withArgs(sami.address, 7n, STREAK_BONUS);
      await expect(tx).to.emit(rewards, "DailyRewardClaimed").withArgs(sami.address, await today(), 7n, DAILY);
      expect(await rewards.getStreak(sami.address)).to.equal(7n);
      expect((await rewards.getRewardInfo(sami.address)).totalEarned).to.equal(7n * DAILY + STREAK_BONUS);
    });

    it("le bonus revient tous les 7 jours (14e jour), pas entre les deux", async function () {
      const { rewards, sami } = await loadFixture(memberFixture);
      let bonuses = 0;
      for (let i = 1; i <= 14; i++) {
        const receipt = await (await rewards.connect(sami).claimDaily()).wait();
        const awarded = receipt.logs.some((l) => rewards.interface.parseLog(l)?.name === "StreakBonusAwarded");
        if (awarded) {
          bonuses += 1;
          expect([7, 14]).to.include(i);
        }
        await goToNextDay();
      }
      expect(bonuses).to.equal(2);
      expect((await rewards.getRewardInfo(sami.address)).totalEarned).to.equal(14n * DAILY + 2n * STREAK_BONUS);
    });

    it("rater un jour remet la série à 1", async function () {
      const { rewards, sami } = await loadFixture(memberFixture);
      await rewards.connect(sami).claimDaily(); // jour 1
      await goToNextDay();
      await rewards.connect(sami).claimDaily(); // jour 2
      expect(await rewards.getStreak(sami.address)).to.equal(2n);

      await goToNextDay(); // jour 3 : oublié
      expect(await rewards.getStreak(sami.address)).to.equal(2n); // pas encore cassée (dernier jour = hier)
      await goToNextDay(); // jour 4
      expect(await rewards.getStreak(sami.address)).to.equal(0n); // cassée
      expect((await rewards.getRewardInfo(sami.address)).streak).to.equal(0n);

      await expect(rewards.connect(sami).claimDaily())
        .to.emit(rewards, "DailyRewardClaimed")
        .withArgs(sami.address, await today(), 1n, DAILY);
      expect(await rewards.getStreak(sami.address)).to.equal(1n);
    });

    it("une série cassée au 6e jour ne donne pas le bonus le lendemain du retour", async function () {
      const { rewards, sami } = await loadFixture(memberFixture);
      for (let i = 0; i < 6; i++) {
        await rewards.connect(sami).claimDaily();
        await goToNextDay();
      }
      await goToNextDay(); // jour 7 oublié
      await expect(rewards.connect(sami).claimDaily()).not.to.emit(rewards, "StreakBonusAwarded");
      expect(await rewards.getStreak(sami.address)).to.equal(1n);
    });
  });

  describe("Fin de l'abonnement", function () {
    it("quand l'abonnement expire, les récompenses s'arrêtent", async function () {
      const { rewards, gm, ali, sami } = await loadFixture(deployFixture);
      await gm.connect(sami).subscribe(1, ali.address, 1); // 30 jours
      await rewards.connect(sami).claimDaily();

      await time.increase(MONTH + 1n);
      expect(await gm.isActiveMember(sami.address)).to.equal(false);
      await expect(rewards.connect(sami).claimDaily()).to.be.revertedWith(
        "RewardManager : un abonnement actif est requis pour être récompensé"
      );
      await expect(rewards.connect(sami).claimWelcomeBonus()).to.be.revertedWith(
        "RewardManager : un abonnement actif est requis pour être récompensé"
      );
    });

    it("un réabonnement réactive les récompenses (la série repart à 1)", async function () {
      const { rewards, gm, sami } = await loadFixture(deployFixture);
      await gm.connect(sami).subscribe(1, ethers.ZeroAddress, 1);
      await rewards.connect(sami).claimDaily();
      await time.increase(MONTH + 1n);

      await gm.connect(sami).subscribe(1, ethers.ZeroAddress, 1);
      await expect(rewards.connect(sami).claimDaily()).to.emit(rewards, "DailyRewardClaimed");
      expect(await rewards.getStreak(sami.address)).to.equal(1n);
    });
  });
});
