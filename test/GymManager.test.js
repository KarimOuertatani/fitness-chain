const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const ftc = (value) => ethers.parseUnits(value, 18);
const MONTH = 30n * 24n * 60n * 60n;
const AppStatus = { Pending: 0n, Accepted: 1n, Rejected: 2n, Cancelled: 3n };

const MONTHLY = ftc("30");
const AFFILIATION = ftc("40");
const COACHING = ftc("20");

describe("GymManager", function () {
  async function deployFixture() {
    const [deployer, alpha, beta, gamma, ali, karim, noCert, gymOwner, sami, other] = await ethers.getSigners();

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
    const GymManager = await ethers.getContractFactory("GymManager");
    const gm = await GymManager.deploy(await fitCoin.getAddress(), await cert.getAddress());
    const gmAddress = await gm.getAddress();
    const certAddress = await cert.getAddress();

    // Tout le monde achète 1 000 FTC et autorise GymManager et CoachCertificate
    for (const s of [ali, karim, noCert, gymOwner, sami, other]) {
      await fitCoin.connect(s).buyTokens({ value: ethers.parseEther("0.1") });
      await fitCoin.connect(s).approve(gmAddress, ethers.MaxUint256);
      await fitCoin.connect(s).approve(certAddress, ethers.MaxUint256);
    }

    // Ali et Karim obtiennent un certificat valide (formation de 200 FTC, validité 730 jours)
    await cert.connect(alpha).createTraining("Préparateur physique N1", ftc("200"), 30, 730, "");
    let requestId = 0;
    for (const [coach, file] of [
      [ali, "diplome-ali.pdf"],
      [karim, "diplome-karim.pdf"],
    ]) {
      requestId += 1;
      await cert.connect(coach).requestTraining(1);
      await cert.connect(alpha).acceptRequest(requestId);
      await cert.connect(alpha).completeTraining(requestId, ethers.id(file), "");
    }

    // Iron Gym : 30 FTC / mois, affiliation 40 FTC
    await gm.connect(gymOwner).registerGym("Iron Gym", MONTHLY, AFFILIATION, "ipfs://iron-gym");

    return { fitCoin, dao, cert, gm, gmAddress, GymManager, alpha, beta, gamma, ali, karim, noCert, gymOwner, sami, other };
  }

  /** Ali est coach d'Iron Gym (candidature n°1 acceptée, 20 FTC / mois). */
  async function withCoachFixture() {
    const ctx = await deployFixture();
    await ctx.gm.connect(ctx.ali).applyToGym(1, COACHING);
    await ctx.gm.connect(ctx.gymOwner).acceptCoach(1);
    return ctx;
  }

  describe("Déploiement", function () {
    it("définit MONTH = 30 jours", async function () {
      const { gm } = await loadFixture(deployFixture);
      expect(await gm.MONTH()).to.equal(MONTH);
    });

    it("refuse des adresses nulles", async function () {
      const { GymManager, fitCoin, cert } = await loadFixture(deployFixture);
      await expect(GymManager.deploy(ethers.ZeroAddress, await cert.getAddress())).to.be.revertedWith(
        "GymManager : adresse de FitCoin nulle"
      );
      await expect(GymManager.deploy(await fitCoin.getAddress(), ethers.ZeroAddress)).to.be.revertedWith(
        "GymManager : adresse de CoachCertificate nulle"
      );
    });
  });

  describe("Salles", function () {
    it("n'importe qui peut inscrire une salle (identifiant 1)", async function () {
      const { gm, gymOwner } = await loadFixture(deployFixture);
      const g = await gm.getGym(1);
      expect(g.id).to.equal(1n);
      expect(g.owner).to.equal(gymOwner.address);
      expect(g.name).to.equal("Iron Gym");
      expect(g.monthlyFee).to.equal(MONTHLY);
      expect(g.affiliationFee).to.equal(AFFILIATION);
      expect(g.metadataURI).to.equal("ipfs://iron-gym");
      expect(g.active).to.equal(true);
      expect(await gm.getGymCount()).to.equal(1n);
      expect(await gm.getGymsOf(gymOwner.address)).to.deep.equal([1n]);
    });

    it("émet GymRegistered", async function () {
      const { gm, other } = await loadFixture(deployFixture);
      await expect(gm.connect(other).registerGym("Fit Club", ftc("25"), 0, ""))
        .to.emit(gm, "GymRegistered")
        .withArgs(2n, other.address, "Fit Club");
    });

    it("refuse un nom vide ou un abonnement mensuel nul", async function () {
      const { gm, other } = await loadFixture(deployFixture);
      await expect(gm.connect(other).registerGym("", MONTHLY, 0, "")).to.be.revertedWith(
        "GymManager : le nom de la salle est obligatoire"
      );
      await expect(gm.connect(other).registerGym("Salle", 0, 0, "")).to.be.revertedWith(
        "GymManager : l'abonnement mensuel doit être supérieur à 0"
      );
    });

    it("le propriétaire modifie sa salle", async function () {
      const { gm, gymOwner } = await loadFixture(deployFixture);
      await expect(gm.connect(gymOwner).updateGym(1, ftc("35"), ftc("50"), "ipfs://v2", false))
        .to.emit(gm, "GymUpdated")
        .withArgs(1n, ftc("35"), ftc("50"), false);
      const g = await gm.getGym(1);
      expect(g.monthlyFee).to.equal(ftc("35"));
      expect(g.affiliationFee).to.equal(ftc("50"));
      expect(g.metadataURI).to.equal("ipfs://v2");
      expect(g.active).to.equal(false);
    });

    it("seul le propriétaire peut modifier sa salle", async function () {
      const { gm, ali, other } = await loadFixture(deployFixture);
      for (const s of [ali, other]) {
        await expect(gm.connect(s).updateGym(1, MONTHLY, AFFILIATION, "", true)).to.be.revertedWith(
          "GymManager : réservé au propriétaire de la salle"
        );
      }
    });

    it("refuse de mettre l'abonnement mensuel à 0", async function () {
      const { gm, gymOwner } = await loadFixture(deployFixture);
      await expect(gm.connect(gymOwner).updateGym(1, 0, AFFILIATION, "", true)).to.be.revertedWith(
        "GymManager : l'abonnement mensuel doit être supérieur à 0"
      );
    });

    it("refuse une salle inexistante", async function () {
      const { gm, gymOwner } = await loadFixture(deployFixture);
      await expect(gm.getGym(0)).to.be.revertedWith("GymManager : salle inexistante");
      await expect(gm.connect(gymOwner).updateGym(7, MONTHLY, 0, "", true)).to.be.revertedWith(
        "GymManager : salle inexistante"
      );
    });
  });

  describe("Candidatures des coachs", function () {
    it("un coach sans certificat valide ne peut pas postuler", async function () {
      const { gm, noCert } = await loadFixture(deployFixture);
      await expect(gm.connect(noCert).applyToGym(1, COACHING)).to.be.revertedWith(
        "GymManager : un certificat valide est requis"
      );
    });

    it("un coach dont le certificat a expiré ne peut pas postuler", async function () {
      const { gm, ali } = await loadFixture(deployFixture);
      await time.increase(731n * 24n * 60n * 60n);
      await expect(gm.connect(ali).applyToGym(1, COACHING)).to.be.revertedWith(
        "GymManager : un certificat valide est requis"
      );
    });

    it("un coach dont le certificat est révoqué ne peut pas postuler", async function () {
      const { gm, cert, alpha, ali } = await loadFixture(deployFixture);
      await cert.connect(alpha).revokeCertificate(1, "Fraude");
      await expect(gm.connect(ali).applyToGym(1, COACHING)).to.be.revertedWith(
        "GymManager : un certificat valide est requis"
      );
    });

    it("la candidature bloque les frais d'affiliation dans le contrat", async function () {
      const { gm, fitCoin, ali, gymOwner, gmAddress } = await loadFixture(deployFixture);
      const tx = gm.connect(ali).applyToGym(1, COACHING);
      await expect(tx).to.emit(gm, "CoachApplied").withArgs(1n, 1n, ali.address, COACHING);
      await expect(tx).to.changeTokenBalances(fitCoin, [ali, gmAddress, gymOwner], [-AFFILIATION, AFFILIATION, 0n]);

      const a = await gm.getApplication(1);
      expect(a.id).to.equal(1n);
      expect(a.gymId).to.equal(1n);
      expect(a.coach).to.equal(ali.address);
      expect(a.coachingPrice).to.equal(COACHING);
      expect(a.amount).to.equal(AFFILIATION);
      expect(a.status).to.equal(AppStatus.Pending);
      expect(await gm.getApplicationsOfGym(1)).to.deep.equal([1n]);
      expect(await gm.getApplicationsOfCoach(ali.address)).to.deep.equal([1n]);
      expect(await gm.isGymCoach(1, ali.address)).to.equal(false);
    });

    it("si la salle accepte, le coach rejoint l'équipe et la salle reçoit les frais", async function () {
      const { gm, fitCoin, ali, gymOwner, gmAddress } = await loadFixture(deployFixture);
      await gm.connect(ali).applyToGym(1, COACHING);
      const tx = gm.connect(gymOwner).acceptCoach(1);
      await expect(tx).to.emit(gm, "CoachAccepted").withArgs(1n, 1n, ali.address);
      await expect(tx).to.changeTokenBalances(fitCoin, [gymOwner, gmAddress, ali], [AFFILIATION, -AFFILIATION, 0n]);

      expect((await gm.getApplication(1)).status).to.equal(AppStatus.Accepted);
      expect(await gm.isGymCoach(1, ali.address)).to.equal(true);
      expect(await gm.getCoachGyms(ali.address)).to.deep.equal([1n]);
      const [coaches, prices] = await gm.getGymCoaches(1);
      expect(coaches).to.deep.equal([ali.address]);
      expect(prices).to.deep.equal([COACHING]);
    });

    it("si la salle refuse, le coach est remboursé", async function () {
      const { gm, fitCoin, ali, gymOwner, gmAddress } = await loadFixture(deployFixture);
      await gm.connect(ali).applyToGym(1, COACHING);
      const tx = gm.connect(gymOwner).rejectCoach(1);
      await expect(tx).to.emit(gm, "CoachRejected").withArgs(1n);
      await expect(tx).to.changeTokenBalances(fitCoin, [ali, gmAddress, gymOwner], [AFFILIATION, -AFFILIATION, 0n]);
      expect((await gm.getApplication(1)).status).to.equal(AppStatus.Rejected);
      expect(await gm.isGymCoach(1, ali.address)).to.equal(false);
    });

    it("si le coach annule, il est remboursé", async function () {
      const { gm, fitCoin, ali, gmAddress } = await loadFixture(deployFixture);
      await gm.connect(ali).applyToGym(1, COACHING);
      const tx = gm.connect(ali).cancelApplication(1);
      await expect(tx).to.emit(gm, "ApplicationCancelled").withArgs(1n);
      await expect(tx).to.changeTokenBalances(fitCoin, [ali, gmAddress], [AFFILIATION, -AFFILIATION]);
      expect((await gm.getApplication(1)).status).to.equal(AppStatus.Cancelled);
    });

    it("seul le propriétaire peut accepter ou refuser", async function () {
      const { gm, ali, karim, other } = await loadFixture(deployFixture);
      await gm.connect(ali).applyToGym(1, COACHING);
      for (const s of [ali, karim, other]) {
        await expect(gm.connect(s).acceptCoach(1)).to.be.revertedWith(
          "GymManager : réservé au propriétaire de la salle"
        );
        await expect(gm.connect(s).rejectCoach(1)).to.be.revertedWith(
          "GymManager : réservé au propriétaire de la salle"
        );
      }
    });

    it("seul le coach peut annuler sa candidature", async function () {
      const { gm, ali, gymOwner } = await loadFixture(deployFixture);
      await gm.connect(ali).applyToGym(1, COACHING);
      await expect(gm.connect(gymOwner).cancelApplication(1)).to.be.revertedWith(
        "GymManager : seul le coach peut annuler sa candidature"
      );
    });

    it("refuse une deuxième candidature en attente", async function () {
      const { gm, ali } = await loadFixture(deployFixture);
      await gm.connect(ali).applyToGym(1, COACHING);
      await expect(gm.connect(ali).applyToGym(1, COACHING)).to.be.revertedWith(
        "GymManager : une candidature est déjà en attente"
      );
    });

    it("refuse qu'un coach déjà dans la salle postule à nouveau", async function () {
      const { gm, ali } = await loadFixture(withCoachFixture);
      await expect(gm.connect(ali).applyToGym(1, COACHING)).to.be.revertedWith(
        "GymManager : vous êtes déjà coach dans cette salle"
      );
    });

    it("refuse de postuler dans une salle inactive", async function () {
      const { gm, gymOwner, ali } = await loadFixture(deployFixture);
      await gm.connect(gymOwner).updateGym(1, MONTHLY, AFFILIATION, "", false);
      await expect(gm.connect(ali).applyToGym(1, COACHING)).to.be.revertedWith("GymManager : salle inactive");
    });

    it("une candidature traitée ne peut plus changer d'état", async function () {
      const { gm, ali, gymOwner } = await loadFixture(withCoachFixture);
      await expect(gm.connect(gymOwner).rejectCoach(1)).to.be.revertedWith(
        "GymManager : la candidature n'est pas en attente"
      );
      await expect(gm.connect(ali).cancelApplication(1)).to.be.revertedWith(
        "GymManager : la candidature n'est pas en attente"
      );
      await expect(gm.getApplication(9)).to.be.revertedWith("GymManager : candidature inexistante");
    });

    it("les frais figés à la candidature ne changent pas si la salle modifie ses tarifs", async function () {
      const { gm, fitCoin, ali, gymOwner } = await loadFixture(deployFixture);
      await gm.connect(ali).applyToGym(1, COACHING);
      await gm.connect(gymOwner).updateGym(1, MONTHLY, ftc("100"), "", true);
      await expect(gm.connect(gymOwner).acceptCoach(1)).to.changeTokenBalance(fitCoin, gymOwner, AFFILIATION);
    });
  });

  describe("Équipe", function () {
    it("le coach modifie son prix de coaching", async function () {
      const { gm, ali } = await loadFixture(withCoachFixture);
      await expect(gm.connect(ali).setCoachingPrice(1, ftc("25")))
        .to.emit(gm, "CoachingPriceUpdated")
        .withArgs(1n, ali.address, ftc("25"));
      const [, prices] = await gm.getGymCoaches(1);
      expect(prices).to.deep.equal([ftc("25")]);
    });

    it("refuse qu'un non-coach de la salle modifie un prix", async function () {
      const { gm, karim, gymOwner } = await loadFixture(withCoachFixture);
      for (const s of [karim, gymOwner]) {
        await expect(gm.connect(s).setCoachingPrice(1, ftc("1"))).to.be.revertedWith(
          "GymManager : vous n'êtes pas coach dans cette salle"
        );
      }
    });

    it("le propriétaire retire un coach", async function () {
      const { gm, ali, karim, gymOwner } = await loadFixture(withCoachFixture);
      await gm.connect(karim).applyToGym(1, ftc("15"));
      await gm.connect(gymOwner).acceptCoach(2);

      await expect(gm.connect(gymOwner).removeCoach(1, ali.address))
        .to.emit(gm, "CoachRemoved")
        .withArgs(1n, ali.address);
      expect(await gm.isGymCoach(1, ali.address)).to.equal(false);
      expect(await gm.getCoachGyms(ali.address)).to.deep.equal([]);
      const [coaches, prices] = await gm.getGymCoaches(1);
      expect(coaches).to.deep.equal([karim.address]);
      expect(prices).to.deep.equal([ftc("15")]);
    });

    it("le coach quitte la salle et peut postuler de nouveau ensuite", async function () {
      const { gm, ali } = await loadFixture(withCoachFixture);
      await gm.connect(ali).removeCoach(1, ali.address);
      expect(await gm.isGymCoach(1, ali.address)).to.equal(false);
      await expect(gm.connect(ali).applyToGym(1, COACHING)).to.emit(gm, "CoachApplied");
    });

    it("refuse qu'une autre personne retire un coach", async function () {
      const { gm, ali, karim, other } = await loadFixture(withCoachFixture);
      for (const s of [karim, other]) {
        await expect(gm.connect(s).removeCoach(1, ali.address)).to.be.revertedWith(
          "GymManager : réservé au propriétaire de la salle ou au coach"
        );
      }
    });

    it("refuse de retirer un coach qui n'est pas dans la salle", async function () {
      const { gm, gymOwner, karim } = await loadFixture(withCoachFixture);
      await expect(gm.connect(gymOwner).removeCoach(1, karim.address)).to.be.revertedWith(
        "GymManager : ce coach ne fait pas partie de la salle"
      );
    });

    it("un coach peut travailler dans plusieurs salles", async function () {
      const { gm, ali, other } = await loadFixture(withCoachFixture);
      await gm.connect(other).registerGym("Fit Club", ftc("25"), 0, "");
      await gm.connect(ali).applyToGym(2, ftc("10"));
      await gm.connect(other).acceptCoach(2);
      expect(await gm.getCoachGyms(ali.address)).to.deep.equal([1n, 2n]);
      await gm.connect(ali).removeCoach(1, ali.address);
      expect(await gm.getCoachGyms(ali.address)).to.deep.equal([2n]);
    });
  });

  describe("Abonnements", function () {
    it("quote calcule le prix total, la part salle et la part coach", async function () {
      const { gm, ali } = await loadFixture(withCoachFixture);
      const [total, gymPart, coachPart] = await gm.quote(1, ali.address, 2);
      expect(gymPart).to.equal(ftc("60"));
      expect(coachPart).to.equal(ftc("40"));
      expect(total).to.equal(ftc("100"));
      const [totalSansCoach, , partCoach] = await gm.quote(1, ethers.ZeroAddress, 3);
      expect(totalSansCoach).to.equal(ftc("90"));
      expect(partCoach).to.equal(0n);
    });

    it("l'abonnement avec coach verse 30 FTC à la salle et 20 FTC au coach", async function () {
      const { gm, fitCoin, ali, gymOwner, sami, gmAddress } = await loadFixture(withCoachFixture);
      const tx = gm.connect(sami).subscribe(1, ali.address, 1);
      await expect(tx).to.changeTokenBalances(
        fitCoin,
        [sami, gymOwner, ali, gmAddress],
        [-ftc("50"), ftc("30"), ftc("20"), 0n]
      );
      const s = await gm.getSubscription(sami.address, 1);
      expect(s.coach).to.equal(ali.address);
      expect(s.endTime).to.equal(BigInt(await time.latest()) + MONTH);
    });

    it("émet Subscribed avec la répartition et la date de fin", async function () {
      const { gm, ali, sami } = await loadFixture(withCoachFixture);
      const next = BigInt(await time.latest()) + 1n;
      await time.setNextBlockTimestamp(next);
      await expect(gm.connect(sami).subscribe(1, ali.address, 2))
        .to.emit(gm, "Subscribed")
        .withArgs(1n, sami.address, ali.address, 2n, ftc("60"), ftc("40"), next + 2n * MONTH);
    });

    it("l'abonnement sans coach verse tout à la salle", async function () {
      const { gm, fitCoin, gymOwner, sami } = await loadFixture(deployFixture);
      await expect(gm.connect(sami).subscribe(1, ethers.ZeroAddress, 2)).to.changeTokenBalances(
        fitCoin,
        [sami, gymOwner],
        [-ftc("60"), ftc("60")]
      );
      expect((await gm.getSubscription(sami.address, 1)).coach).to.equal(ethers.ZeroAddress);
      expect(await gm.getMemberGyms(sami.address)).to.deep.equal([1n]);
      expect(await gm.isActiveMember(sami.address)).to.equal(true);
    });

    it("on ne peut pas choisir un coach qui n'est pas dans la salle", async function () {
      const { gm, karim, noCert, sami } = await loadFixture(withCoachFixture);
      for (const coach of [karim, noCert]) {
        await expect(gm.connect(sami).subscribe(1, coach.address, 1)).to.be.revertedWith(
          "GymManager : ce coach ne fait pas partie de la salle"
        );
        await expect(gm.quote(1, coach.address, 1)).to.be.revertedWith(
          "GymManager : ce coach ne fait pas partie de la salle"
        );
      }
    });

    it("on ne peut plus choisir un coach retiré de la salle", async function () {
      const { gm, ali, gymOwner, sami } = await loadFixture(withCoachFixture);
      await gm.connect(gymOwner).removeCoach(1, ali.address);
      await expect(gm.connect(sami).subscribe(1, ali.address, 1)).to.be.revertedWith(
        "GymManager : ce coach ne fait pas partie de la salle"
      );
    });

    it("refuse un coach de la salle dont le certificat n'est plus valide", async function () {
      const { gm, cert, alpha, ali, sami } = await loadFixture(withCoachFixture);
      await cert.connect(alpha).revokeCertificate(1, "Fraude");
      await expect(gm.connect(sami).subscribe(1, ali.address, 1)).to.be.revertedWith(
        "GymManager : le coach n'a plus de certificat valide"
      );
      // Sans coach, l'abonnement reste possible
      await expect(gm.connect(sami).subscribe(1, ethers.ZeroAddress, 1)).to.emit(gm, "Subscribed");
    });

    it("refuse une durée hors de 1 à 12 mois", async function () {
      const { gm, sami } = await loadFixture(deployFixture);
      for (const months of [0, 13]) {
        await expect(gm.connect(sami).subscribe(1, ethers.ZeroAddress, months)).to.be.revertedWith(
          "GymManager : durée entre 1 et 12 mois"
        );
      }
      await expect(gm.connect(sami).subscribe(1, ethers.ZeroAddress, 12)).to.emit(gm, "Subscribed");
    });

    it("refuse de s'abonner à une salle inactive ou inexistante", async function () {
      const { gm, gymOwner, sami } = await loadFixture(deployFixture);
      await expect(gm.connect(sami).subscribe(2, ethers.ZeroAddress, 1)).to.be.revertedWith(
        "GymManager : salle inexistante"
      );
      await gm.connect(gymOwner).updateGym(1, MONTHLY, AFFILIATION, "", false);
      await expect(gm.connect(sami).subscribe(1, ethers.ZeroAddress, 1)).to.be.revertedWith(
        "GymManager : salle inactive"
      );
    });

    it("le renouvellement ajoute les jours à la fin de l'abonnement en cours", async function () {
      const { gm, sami } = await loadFixture(deployFixture);
      await gm.connect(sami).subscribe(1, ethers.ZeroAddress, 2);
      const firstEnd = (await gm.getSubscription(sami.address, 1)).endTime;
      await time.increase(10n * 24n * 60n * 60n); // 10 jours plus tard
      await gm.connect(sami).subscribe(1, ethers.ZeroAddress, 1);
      expect((await gm.getSubscription(sami.address, 1)).endTime).to.equal(firstEnd + MONTH);
      // Pas de doublon dans la liste des salles de l'adhérent
      expect(await gm.getMemberGyms(sami.address)).to.deep.equal([1n]);
    });

    it("un renouvellement après expiration repart de maintenant", async function () {
      const { gm, sami } = await loadFixture(deployFixture);
      await gm.connect(sami).subscribe(1, ethers.ZeroAddress, 1);
      await time.increase(MONTH + 100n);
      const next = BigInt(await time.latest()) + 1n;
      await time.setNextBlockTimestamp(next);
      await gm.connect(sami).subscribe(1, ethers.ZeroAddress, 1);
      expect((await gm.getSubscription(sami.address, 1)).endTime).to.equal(next + MONTH);
    });

    it("isActiveMember devient faux quand l'abonnement expire", async function () {
      const { gm, sami, other } = await loadFixture(deployFixture);
      expect(await gm.isActiveMember(sami.address)).to.equal(false);
      await gm.connect(sami).subscribe(1, ethers.ZeroAddress, 1);
      expect(await gm.isActiveMember(sami.address)).to.equal(true);
      await time.increase(MONTH - 10n);
      expect(await gm.isActiveMember(sami.address)).to.equal(true);
      await time.increase(10n);
      expect(await gm.isActiveMember(sami.address)).to.equal(false);
      // L'historique reste visible
      expect(await gm.getMemberGyms(sami.address)).to.deep.equal([1n]);
      expect(await gm.isActiveMember(other.address)).to.equal(false);
    });

    it("isActiveMember reste vrai tant qu'un des abonnements est actif", async function () {
      const { gm, sami, other } = await loadFixture(deployFixture);
      await gm.connect(other).registerGym("Fit Club", ftc("25"), 0, "");
      await gm.connect(sami).subscribe(1, ethers.ZeroAddress, 1);
      await gm.connect(sami).subscribe(2, ethers.ZeroAddress, 3);
      await time.increase(MONTH + 1n);
      expect(await gm.isActiveMember(sami.address)).to.equal(true);
      expect(await gm.getMemberGyms(sami.address)).to.deep.equal([1n, 2n]);
    });

    it("refuse l'abonnement sans autorisation FTC (approve)", async function () {
      const { gm, fitCoin, gmAddress, sami } = await loadFixture(deployFixture);
      await fitCoin.connect(sami).approve(gmAddress, 0);
      await expect(gm.connect(sami).subscribe(1, ethers.ZeroAddress, 1)).to.be.revertedWithCustomError(
        fitCoin,
        "ERC20InsufficientAllowance"
      );
    });
  });
});
