const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const ftc = (value) => ethers.parseUnits(value, 18);
const DAY = 24n * 60n * 60n;
const VOTING_PERIOD = 300;

const RequestStatus = { Pending: 0n, Accepted: 1n, Rejected: 2n, Cancelled: 3n, Completed: 4n };
const CertStatus = { NotFound: 0n, Valid: 1n, Revoked: 2n, Expired: 3n, IssuerRemoved: 4n };

const PRICE = ftc("200");
const HASH = ethers.id("diplome-ali.pdf");
const URI = "ipfs://certificat-ali";

describe("CoachCertificate", function () {
  async function deployFixture() {
    const [deployer, alpha, beta, gamma, coach, coach2, outsider] = await ethers.getSigners();

    const fitCoin = await (await ethers.getContractFactory("FitCoin")).deploy();
    const dao = await (await ethers.getContractFactory("CenterDAO")).deploy(
      [alpha.address, beta.address, gamma.address],
      ["Centre Alpha", "Centre Beta", "Centre Gamma"],
      VOTING_PERIOD
    );
    const CoachCertificate = await ethers.getContractFactory("CoachCertificate");
    const cert = await CoachCertificate.deploy(await dao.getAddress(), await fitCoin.getAddress());
    const certAddress = await cert.getAddress();

    // Les coachs achètent 1 000 FTC chacun (0,1 ETH)
    for (const c of [coach, coach2]) {
      await fitCoin.connect(c).buyTokens({ value: ethers.parseEther("0.1") });
      await fitCoin.connect(c).approve(certAddress, ethers.MaxUint256);
    }

    // Centre Alpha publie une formation : 200 FTC, 30 jours, validité 730 jours
    await cert.connect(alpha).createTraining("Préparateur physique N1", PRICE, 30, 730, "ipfs://formation");

    return { fitCoin, dao, cert, certAddress, CoachCertificate, deployer, alpha, beta, gamma, coach, coach2, outsider };
  }

  /** Demande n°1 du coach, acceptée par Alpha. */
  async function acceptedFixture() {
    const ctx = await deployFixture();
    await ctx.cert.connect(ctx.coach).requestTraining(1);
    await ctx.cert.connect(ctx.alpha).acceptRequest(1);
    return ctx;
  }

  /** Certificat n°1 délivré au coach par Alpha. */
  async function certifiedFixture() {
    const ctx = await acceptedFixture();
    await ctx.cert.connect(ctx.alpha).completeTraining(1, HASH, URI);
    return ctx;
  }

  /** Exclut `target` de la DAO (proposition, votes des deux autres fondateurs, exécution). */
  async function exclude(dao, target, [voterA, voterB]) {
    await dao.connect(voterA).proposeRemove(target.address);
    const id = (await dao.proposalCount()) - 1n;
    await dao.connect(voterA).vote(id, true);
    await dao.connect(voterB).vote(id, true);
    await dao.execute(id);
  }

  describe("Déploiement", function () {
    it("a le nom « Fitness Chain Certificate », le symbole « FCC » et référence la DAO et FitCoin", async function () {
      const { cert, dao, fitCoin } = await loadFixture(deployFixture);
      expect(await cert.name()).to.equal("Fitness Chain Certificate");
      expect(await cert.symbol()).to.equal("FCC");
      expect(await cert.dao()).to.equal(await dao.getAddress());
      expect(await cert.fitCoin()).to.equal(await fitCoin.getAddress());
    });

    it("refuse des adresses nulles", async function () {
      const { CoachCertificate, dao, fitCoin } = await loadFixture(deployFixture);
      await expect(CoachCertificate.deploy(ethers.ZeroAddress, await fitCoin.getAddress())).to.be.revertedWith(
        "CoachCertificate : adresse de la DAO nulle"
      );
      await expect(CoachCertificate.deploy(await dao.getAddress(), ethers.ZeroAddress)).to.be.revertedWith(
        "CoachCertificate : adresse de FitCoin nulle"
      );
    });
  });

  describe("Formations", function () {
    it("un centre agréé publie une formation (identifiant 1)", async function () {
      const { cert, alpha } = await loadFixture(deployFixture);
      const t = await cert.getTraining(1);
      expect(t.id).to.equal(1n);
      expect(t.center).to.equal(alpha.address);
      expect(t.title).to.equal("Préparateur physique N1");
      expect(t.price).to.equal(PRICE);
      expect(t.durationDays).to.equal(30n);
      expect(t.validityDays).to.equal(730n);
      expect(t.metadataURI).to.equal("ipfs://formation");
      expect(t.active).to.equal(true);
      expect(await cert.getTrainingCount()).to.equal(1n);
      expect(await cert.getTrainingsOf(alpha.address)).to.deep.equal([1n]);
    });

    it("émet TrainingCreated", async function () {
      const { cert, beta } = await loadFixture(deployFixture);
      await expect(cert.connect(beta).createTraining("Yoga", ftc("50"), 10, 0, ""))
        .to.emit(cert, "TrainingCreated")
        .withArgs(2n, beta.address, "Yoga", ftc("50"));
    });

    it("refuse qu'un non-centre publie une formation", async function () {
      const { cert, outsider, coach } = await loadFixture(deployFixture);
      for (const s of [outsider, coach]) {
        await expect(cert.connect(s).createTraining("Fausse formation", PRICE, 30, 730, "")).to.be.revertedWith(
          "CoachCertificate : réservé aux centres agréés"
        );
      }
    });

    it("refuse qu'un centre exclu publie une formation", async function () {
      const { cert, dao, alpha, beta, gamma } = await loadFixture(deployFixture);
      await exclude(dao, gamma, [alpha, beta]);
      await expect(cert.connect(gamma).createTraining("Formation", PRICE, 30, 730, "")).to.be.revertedWith(
        "CoachCertificate : réservé aux centres agréés"
      );
    });

    it("refuse un intitulé vide", async function () {
      const { cert, alpha } = await loadFixture(deployFixture);
      await expect(cert.connect(alpha).createTraining("", PRICE, 30, 730, "")).to.be.revertedWith(
        "CoachCertificate : l'intitulé est obligatoire"
      );
    });

    it("le centre propriétaire modifie sa formation", async function () {
      const { cert, alpha } = await loadFixture(deployFixture);
      await expect(cert.connect(alpha).updateTraining(1, ftc("250"), "ipfs://v2", false))
        .to.emit(cert, "TrainingUpdated")
        .withArgs(1n, ftc("250"), false);
      const t = await cert.getTraining(1);
      expect(t.price).to.equal(ftc("250"));
      expect(t.metadataURI).to.equal("ipfs://v2");
      expect(t.active).to.equal(false);
    });

    it("refuse qu'un autre centre modifie la formation", async function () {
      const { cert, beta } = await loadFixture(deployFixture);
      await expect(cert.connect(beta).updateTraining(1, ftc("1"), "", true)).to.be.revertedWith(
        "CoachCertificate : seul le centre de la formation peut la modifier"
      );
    });

    it("refuse une formation inexistante", async function () {
      const { cert, alpha } = await loadFixture(deployFixture);
      await expect(cert.getTraining(0)).to.be.revertedWith("CoachCertificate : formation inexistante");
      await expect(cert.connect(alpha).updateTraining(9, 1, "", true)).to.be.revertedWith(
        "CoachCertificate : formation inexistante"
      );
    });
  });

  describe("Demandes et séquestre", function () {
    it("la demande bloque le prix dans le contrat", async function () {
      const { cert, fitCoin, coach, alpha, certAddress } = await loadFixture(deployFixture);
      const tx = cert.connect(coach).requestTraining(1);
      await expect(tx)
        .to.emit(cert, "TrainingRequested")
        .withArgs(1n, 1n, coach.address, PRICE);
      await expect(tx).to.changeTokenBalances(fitCoin, [coach, certAddress, alpha], [-PRICE, PRICE, 0n]);

      const r = await cert.getRequest(1);
      expect(r.id).to.equal(1n);
      expect(r.trainingId).to.equal(1n);
      expect(r.coach).to.equal(coach.address);
      expect(r.center).to.equal(alpha.address);
      expect(r.amount).to.equal(PRICE);
      expect(r.status).to.equal(RequestStatus.Pending);
      expect(r.createdAt).to.equal(BigInt(await time.latest()));
      expect(await cert.getRequestsOfCoach(coach.address)).to.deep.equal([1n]);
      expect(await cert.getRequestsOfCenter(alpha.address)).to.deep.equal([1n]);
    });

    it("refuse une demande sans autorisation FTC (approve)", async function () {
      const { cert, fitCoin, outsider } = await loadFixture(deployFixture);
      await fitCoin.connect(outsider).buyTokens({ value: ethers.parseEther("0.1") });
      await expect(cert.connect(outsider).requestTraining(1)).to.be.revertedWithCustomError(
        fitCoin,
        "ERC20InsufficientAllowance"
      );
    });

    it("refuse une demande pour une formation inactive", async function () {
      const { cert, alpha, coach } = await loadFixture(deployFixture);
      await cert.connect(alpha).updateTraining(1, PRICE, "", false);
      await expect(cert.connect(coach).requestTraining(1)).to.be.revertedWith("CoachCertificate : formation inactive");
    });

    it("refuse une demande si le centre a été exclu", async function () {
      const { cert, dao, alpha, beta, gamma, coach } = await loadFixture(deployFixture);
      await exclude(dao, alpha, [beta, gamma]);
      await expect(cert.connect(coach).requestTraining(1)).to.be.revertedWith(
        "CoachCertificate : le centre n'est plus agréé"
      );
    });

    it("une modification du prix n'affecte pas une demande existante", async function () {
      const { cert, alpha, coach } = await loadFixture(deployFixture);
      await cert.connect(coach).requestTraining(1);
      await cert.connect(alpha).updateTraining(1, ftc("999"), "", true);
      expect((await cert.getRequest(1)).amount).to.equal(PRICE);
    });

    it("le refus rembourse le coach", async function () {
      const { cert, fitCoin, alpha, coach, certAddress } = await loadFixture(deployFixture);
      await cert.connect(coach).requestTraining(1);
      const tx = cert.connect(alpha).rejectRequest(1);
      await expect(tx)
        .to.emit(cert, "RequestRejected")
        .withArgs(1n);
      await expect(tx).to.changeTokenBalances(fitCoin, [coach, certAddress], [PRICE, -PRICE]);
      expect((await cert.getRequest(1)).status).to.equal(RequestStatus.Rejected);
    });

    it("le coach annule une demande en attente et est remboursé", async function () {
      const { cert, fitCoin, coach, certAddress } = await loadFixture(deployFixture);
      await cert.connect(coach).requestTraining(1);
      const tx = cert.connect(coach).cancelRequest(1);
      await expect(tx)
        .to.emit(cert, "RequestCancelled")
        .withArgs(1n);
      await expect(tx).to.changeTokenBalances(fitCoin, [coach, certAddress], [PRICE, -PRICE]);
      expect((await cert.getRequest(1)).status).to.equal(RequestStatus.Cancelled);
    });

    it("le coach ne peut pas annuler une demande acceptée tant que le centre est agréé", async function () {
      const { cert, coach } = await loadFixture(acceptedFixture);
      await expect(cert.connect(coach).cancelRequest(1)).to.be.revertedWith(
        "CoachCertificate : cette demande ne peut plus être annulée"
      );
    });

    it("le coach annule une demande acceptée si le centre a été exclu, et est remboursé", async function () {
      const { cert, dao, fitCoin, alpha, beta, gamma, coach, certAddress } = await loadFixture(acceptedFixture);
      await exclude(dao, alpha, [beta, gamma]);
      await expect(cert.connect(coach).cancelRequest(1)).to.changeTokenBalances(
        fitCoin,
        [coach, certAddress],
        [PRICE, -PRICE]
      );
      expect((await cert.getRequest(1)).status).to.equal(RequestStatus.Cancelled);
    });

    it("seul le coach de la demande peut l'annuler", async function () {
      const { cert, coach, coach2, alpha } = await loadFixture(deployFixture);
      await cert.connect(coach).requestTraining(1);
      for (const s of [coach2, alpha]) {
        await expect(cert.connect(s).cancelRequest(1)).to.be.revertedWith(
          "CoachCertificate : seul le coach de la demande peut l'annuler"
        );
      }
    });

    it("une demande refusée ou annulée ne peut plus changer d'état", async function () {
      const { cert, alpha, coach } = await loadFixture(deployFixture);
      await cert.connect(coach).requestTraining(1);
      await cert.connect(coach).cancelRequest(1);
      await expect(cert.connect(alpha).acceptRequest(1)).to.be.revertedWith(
        "CoachCertificate : la demande n'est pas en attente"
      );
      await expect(cert.connect(alpha).rejectRequest(1)).to.be.revertedWith(
        "CoachCertificate : la demande n'est pas en attente"
      );
      await expect(cert.connect(coach).cancelRequest(1)).to.be.revertedWith(
        "CoachCertificate : cette demande ne peut plus être annulée"
      );
    });
  });

  describe("Droits des centres", function () {
    it("seul le centre de la demande peut l'accepter", async function () {
      const { cert, beta, coach } = await loadFixture(deployFixture);
      await cert.connect(coach).requestTraining(1);
      await expect(cert.connect(beta).acceptRequest(1)).to.be.revertedWith(
        "CoachCertificate : seul le centre de la demande peut l'accepter"
      );
    });

    it("seul le centre de la demande peut la refuser", async function () {
      const { cert, beta, coach } = await loadFixture(deployFixture);
      await cert.connect(coach).requestTraining(1);
      await expect(cert.connect(beta).rejectRequest(1)).to.be.revertedWith(
        "CoachCertificate : seul le centre de la demande peut la refuser"
      );
    });

    it("le centre accepte une demande en attente", async function () {
      const { cert, alpha, coach } = await loadFixture(deployFixture);
      await cert.connect(coach).requestTraining(1);
      await expect(cert.connect(alpha).acceptRequest(1)).to.emit(cert, "RequestAccepted").withArgs(1n);
      expect((await cert.getRequest(1)).status).to.equal(RequestStatus.Accepted);
      await expect(cert.connect(alpha).acceptRequest(1)).to.be.revertedWith(
        "CoachCertificate : la demande n'est pas en attente"
      );
    });

    it("seul le centre de la demande peut valider la réussite", async function () {
      const { cert, beta, coach } = await loadFixture(acceptedFixture);
      for (const s of [beta, coach]) {
        await expect(cert.connect(s).completeTraining(1, HASH, URI)).to.be.revertedWith(
          "CoachCertificate : seul le centre de la demande peut la valider"
        );
      }
    });

    it("un centre exclu ne peut plus valider de réussite", async function () {
      const { cert, dao, alpha, beta, gamma } = await loadFixture(acceptedFixture);
      await exclude(dao, alpha, [beta, gamma]);
      await expect(cert.connect(alpha).completeTraining(1, HASH, URI)).to.be.revertedWith(
        "CoachCertificate : réservé aux centres agréés"
      );
    });

    it("seul le centre émetteur peut révoquer un certificat", async function () {
      const { cert, beta, coach } = await loadFixture(certifiedFixture);
      for (const s of [beta, coach]) {
        await expect(cert.connect(s).revokeCertificate(1, "Fraude")).to.be.revertedWith(
          "CoachCertificate : seul le centre émetteur peut révoquer ce certificat"
        );
      }
    });

    it("refuse les demandes inexistantes", async function () {
      const { cert, alpha } = await loadFixture(deployFixture);
      await expect(cert.getRequest(1)).to.be.revertedWith("CoachCertificate : demande inexistante");
      await expect(cert.connect(alpha).acceptRequest(5)).to.be.revertedWith("CoachCertificate : demande inexistante");
    });
  });

  describe("Validation et certificat", function () {
    it("la validation paie le centre et crée le certificat NFT du coach", async function () {
      const { cert, fitCoin, alpha, coach, certAddress } = await loadFixture(acceptedFixture);
      const tx = cert.connect(alpha).completeTraining(1, HASH, URI);
      await expect(tx)
        .to.emit(cert, "CertificateIssued")
        .withArgs(1n, 1n, coach.address, alpha.address)
        .and.to.emit(cert, "Transfer")
        .withArgs(ethers.ZeroAddress, coach.address, 1n);
      await expect(tx).to.changeTokenBalances(fitCoin, [alpha, certAddress, coach], [PRICE, -PRICE, 0n]);

      const now = BigInt(await time.latest());
      expect(await cert.ownerOf(1)).to.equal(coach.address);
      expect(await cert.balanceOf(coach.address)).to.equal(1n);
      expect(await cert.tokenURI(1)).to.equal(URI);
      expect((await cert.getRequest(1)).status).to.equal(RequestStatus.Completed);
      expect(await cert.getCertificatesOf(coach.address)).to.deep.equal([1n]);
      expect(await cert.getCertificateCount()).to.equal(1n);
      expect(await cert.certificateIdByHash(HASH)).to.equal(1n);
      expect(await cert.hasValidCertificate(coach.address)).to.equal(true);

      const [status, c] = await cert.verify(1);
      expect(status).to.equal(CertStatus.Valid);
      expect(c.id).to.equal(1n);
      expect(c.coach).to.equal(coach.address);
      expect(c.issuer).to.equal(alpha.address);
      expect(c.trainingId).to.equal(1n);
      expect(c.documentHash).to.equal(HASH);
      expect(c.issuedAt).to.equal(now);
      expect(c.expiresAt).to.equal(now + 730n * DAY);
      expect(c.revoked).to.equal(false);
    });

    it("refuse de valider une demande qui n'est pas acceptée", async function () {
      const { cert, alpha, coach } = await loadFixture(deployFixture);
      await cert.connect(coach).requestTraining(1);
      await expect(cert.connect(alpha).completeTraining(1, HASH, URI)).to.be.revertedWith(
        "CoachCertificate : la demande n'est pas acceptée"
      );
    });

    it("refuse une empreinte de document nulle", async function () {
      const { cert, alpha } = await loadFixture(acceptedFixture);
      await expect(cert.connect(alpha).completeTraining(1, ethers.ZeroHash, URI)).to.be.revertedWith(
        "CoachCertificate : empreinte du document manquante"
      );
    });

    it("un même PDF ne peut pas servir deux fois", async function () {
      const { cert, alpha, coach2 } = await loadFixture(certifiedFixture);
      await cert.connect(coach2).requestTraining(1);
      await cert.connect(alpha).acceptRequest(2);
      await expect(cert.connect(alpha).completeTraining(2, HASH, URI)).to.be.revertedWith(
        "CoachCertificate : ce document a déjà été utilisé"
      );
      // Un autre PDF fonctionne
      await cert.connect(alpha).completeTraining(2, ethers.id("diplome-sami.pdf"), "");
      expect(await cert.getCertificateCount()).to.equal(2n);
    });

    it("une demande ne peut être validée qu'une fois", async function () {
      const { cert, alpha } = await loadFixture(certifiedFixture);
      await expect(cert.connect(alpha).completeTraining(1, ethers.id("autre.pdf"), URI)).to.be.revertedWith(
        "CoachCertificate : la demande n'est pas acceptée"
      );
    });

    it("une formation sans validité donne un certificat sans expiration", async function () {
      const { cert, beta, coach } = await loadFixture(deployFixture);
      await cert.connect(beta).createTraining("Secourisme", ftc("10"), 2, 0, "");
      await cert.connect(coach).requestTraining(2);
      await cert.connect(beta).acceptRequest(1);
      await cert.connect(beta).completeTraining(1, HASH, "");
      const [, c] = await cert.verify(1);
      expect(c.expiresAt).to.equal(0n);
      await time.increase(100n * 365n * DAY);
      expect((await cert.verify(1))[0]).to.equal(CertStatus.Valid);
    });

    it("une formation gratuite fonctionne sans FTC", async function () {
      const { cert, fitCoin, beta, outsider } = await loadFixture(deployFixture);
      await cert.connect(beta).createTraining("Initiation", 0, 1, 0, "");
      await cert.connect(outsider).requestTraining(2);
      await cert.connect(beta).acceptRequest(1);
      await cert.connect(beta).completeTraining(1, HASH, "");
      expect(await cert.ownerOf(1)).to.equal(outsider.address);
      expect(await fitCoin.balanceOf(outsider.address)).to.equal(0n);
    });
  });

  describe("Révocation", function () {
    it("le centre émetteur révoque un certificat avec un motif", async function () {
      const { cert, alpha, coach } = await loadFixture(certifiedFixture);
      await expect(cert.connect(alpha).revokeCertificate(1, "Fraude à l'examen"))
        .to.emit(cert, "CertificateRevoked")
        .withArgs(1n, alpha.address, "Fraude à l'examen");
      const [status, c] = await cert.verify(1);
      expect(status).to.equal(CertStatus.Revoked);
      expect(c.revoked).to.equal(true);
      expect(c.revokeReason).to.equal("Fraude à l'examen");
      expect(await cert.hasValidCertificate(coach.address)).to.equal(false);
    });

    it("refuse de révoquer deux fois", async function () {
      const { cert, alpha } = await loadFixture(certifiedFixture);
      await cert.connect(alpha).revokeCertificate(1, "Fraude");
      await expect(cert.connect(alpha).revokeCertificate(1, "Encore")).to.be.revertedWith(
        "CoachCertificate : certificat déjà révoqué"
      );
    });

    it("refuse un motif vide ou un certificat inexistant", async function () {
      const { cert, alpha } = await loadFixture(certifiedFixture);
      await expect(cert.connect(alpha).revokeCertificate(1, "")).to.be.revertedWith(
        "CoachCertificate : le motif est obligatoire"
      );
      await expect(cert.connect(alpha).revokeCertificate(2, "Fraude")).to.be.revertedWith(
        "CoachCertificate : certificat inexistant"
      );
    });
  });

  describe("Vérification", function () {
    it("Valide : certificat en cours de validité", async function () {
      const { cert } = await loadFixture(certifiedFixture);
      expect((await cert.verify(1))[0]).to.equal(CertStatus.Valid);
      const [status, id] = await cert.verifyDocument(HASH);
      expect(status).to.equal(CertStatus.Valid);
      expect(id).to.equal(1n);
    });

    it("Révoqué : certificat révoqué par son centre", async function () {
      const { cert, alpha } = await loadFixture(certifiedFixture);
      await cert.connect(alpha).revokeCertificate(1, "Fraude");
      expect((await cert.verify(1))[0]).to.equal(CertStatus.Revoked);
      expect((await cert.verifyDocument(HASH))[0]).to.equal(CertStatus.Revoked);
    });

    it("Expiré : la date de validité est dépassée", async function () {
      const { cert, coach } = await loadFixture(certifiedFixture);
      await time.increase(730n * DAY - 10n);
      expect((await cert.verify(1))[0]).to.equal(CertStatus.Valid);
      await time.increase(10n);
      expect((await cert.verify(1))[0]).to.equal(CertStatus.Expired);
      expect((await cert.verifyDocument(HASH))[0]).to.equal(CertStatus.Expired);
      expect(await cert.hasValidCertificate(coach.address)).to.equal(false);
    });

    it("Centre exclu : le centre émetteur a quitté la DAO", async function () {
      const { cert, dao, alpha, beta, gamma, coach } = await loadFixture(certifiedFixture);
      await exclude(dao, alpha, [beta, gamma]);
      expect((await cert.verify(1))[0]).to.equal(CertStatus.IssuerRemoved);
      expect((await cert.verifyDocument(HASH))[0]).to.equal(CertStatus.IssuerRemoved);
      expect(await cert.hasValidCertificate(coach.address)).to.equal(false);
    });

    it("Inexistant : numéro ou PDF inconnu", async function () {
      const { cert } = await loadFixture(certifiedFixture);
      for (const id of [0, 2, 999]) {
        const [status, c] = await cert.verify(id);
        expect(status).to.equal(CertStatus.NotFound);
        expect(c.id).to.equal(0n);
      }
      const [status, id] = await cert.verifyDocument(ethers.id("inconnu.pdf"));
      expect(status).to.equal(CertStatus.NotFound);
      expect(id).to.equal(0n);
    });

    it("priorité des statuts : Révoqué l'emporte sur Expiré et Centre exclu", async function () {
      const { cert, dao, alpha, beta, gamma } = await loadFixture(certifiedFixture);
      await cert.connect(alpha).revokeCertificate(1, "Fraude");
      await exclude(dao, alpha, [beta, gamma]);
      await time.increase(731n * DAY);
      expect((await cert.verify(1))[0]).to.equal(CertStatus.Revoked);
    });

    it("priorité des statuts : Expiré l'emporte sur Centre exclu", async function () {
      const { cert, dao, alpha, beta, gamma } = await loadFixture(certifiedFixture);
      await exclude(dao, alpha, [beta, gamma]);
      await time.increase(731n * DAY);
      expect((await cert.verify(1))[0]).to.equal(CertStatus.Expired);
    });

    it("hasValidCertificate est vrai si au moins un certificat est valide", async function () {
      const { cert, alpha, beta, coach } = await loadFixture(certifiedFixture);
      expect(await cert.hasValidCertificate(beta.address)).to.equal(false);
      // Deuxième certificat chez Beta, puis révocation du premier
      await cert.connect(beta).createTraining("Yoga", ftc("10"), 5, 0, "");
      await cert.connect(coach).requestTraining(2);
      await cert.connect(beta).acceptRequest(2);
      await cert.connect(beta).completeTraining(2, ethers.id("yoga.pdf"), "");
      await cert.connect(alpha).revokeCertificate(1, "Fraude");
      expect(await cert.hasValidCertificate(coach.address)).to.equal(true);
    });
  });

  describe("Soulbound (non transférable)", function () {
    it("refuse transferFrom et safeTransferFrom", async function () {
      const { cert, coach, coach2 } = await loadFixture(certifiedFixture);
      await expect(
        cert.connect(coach).transferFrom(coach.address, coach2.address, 1)
      ).to.be.revertedWithCustomError(cert, "Soulbound");
      await expect(
        cert.connect(coach)["safeTransferFrom(address,address,uint256)"](coach.address, coach2.address, 1)
      ).to.be.revertedWithCustomError(cert, "Soulbound");
      await expect(
        cert.connect(coach)["safeTransferFrom(address,address,uint256,bytes)"](coach.address, coach2.address, 1, "0x")
      ).to.be.revertedWithCustomError(cert, "Soulbound");
      expect(await cert.ownerOf(1)).to.equal(coach.address);
    });

    it("refuse approve et setApprovalForAll", async function () {
      const { cert, coach, coach2 } = await loadFixture(certifiedFixture);
      await expect(cert.connect(coach).approve(coach2.address, 1)).to.be.revertedWithCustomError(cert, "Soulbound");
      await expect(cert.connect(coach).setApprovalForAll(coach2.address, true)).to.be.revertedWithCustomError(
        cert,
        "Soulbound"
      );
    });

    it("locked renvoie true pour un certificat existant et rejette un identifiant inconnu", async function () {
      const { cert } = await loadFixture(certifiedFixture);
      expect(await cert.locked(1)).to.equal(true);
      await expect(cert.locked(2)).to.be.revertedWithCustomError(cert, "ERC721NonexistentToken").withArgs(2n);
    });
  });
});
