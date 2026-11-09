const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const VOTING_PERIOD = 300; // secondes
const ProposalType = { Add: 0n, Remove: 1n };
const Status = { Pending: 0n, Approved: 1n, Rejected: 2n, Executed: 3n };

describe("CenterDAO", function () {
  async function deployFixture() {
    const [deployer, alpha, beta, gamma, academy, outsider, other] = await ethers.getSigners();
    const CenterDAO = await ethers.getContractFactory("CenterDAO");
    const dao = await CenterDAO.deploy(
      [alpha.address, beta.address, gamma.address],
      ["Centre Alpha", "Centre Beta", "Centre Gamma"],
      VOTING_PERIOD
    );
    await dao.waitForDeployment();
    return { dao, CenterDAO, deployer, alpha, beta, gamma, academy, outsider, other };
  }

  /** Ajoute Sport Academy (proposition 0 approuvée et exécutée) : 4 membres. */
  async function withAcademyFixture() {
    const ctx = await deployFixture();
    const { dao, alpha, beta, academy } = ctx;
    await dao.connect(alpha).proposeAdd(academy.address, "Sport Academy");
    await dao.connect(alpha).vote(0, true);
    await dao.connect(beta).vote(0, true);
    await dao.execute(0);
    return ctx;
  }

  describe("Déploiement", function () {
    it("enregistre les fondateurs comme centres actifs", async function () {
      const { dao, alpha, beta, gamma } = await loadFixture(deployFixture);
      expect(await dao.memberCount()).to.equal(3n);
      expect(await dao.votingPeriod()).to.equal(BigInt(VOTING_PERIOD));
      for (const s of [alpha, beta, gamma]) {
        expect(await dao.isActiveCenter(s.address)).to.equal(true);
      }
      const center = await dao.centers(alpha.address);
      expect(center.name).to.equal("Centre Alpha");
      expect(center.active).to.equal(true);
      expect(center.joinedAt).to.be.greaterThan(0n);
      expect(await dao.getCenters()).to.deep.equal([alpha.address, beta.address, gamma.address]);
      expect(await dao.proposalCount()).to.equal(0n);
    });

    it("émet CenterAdded pour chaque fondateur", async function () {
      const { CenterDAO, alpha, beta } = await loadFixture(deployFixture);
      const dao = await CenterDAO.deploy([alpha.address, beta.address], ["A", "B"], VOTING_PERIOD);
      const tx = dao.deploymentTransaction();
      await expect(tx).to.emit(dao, "CenterAdded").withArgs(alpha.address, "A");
      await expect(tx).to.emit(dao, "CenterAdded").withArgs(beta.address, "B");
    });

    it("refuse une liste de fondateurs vide", async function () {
      const { CenterDAO } = await loadFixture(deployFixture);
      await expect(CenterDAO.deploy([], [], VOTING_PERIOD)).to.be.revertedWith(
        "CenterDAO : au moins un centre fondateur est requis"
      );
    });

    it("refuse des listes de tailles différentes", async function () {
      const { CenterDAO, alpha, beta } = await loadFixture(deployFixture);
      await expect(CenterDAO.deploy([alpha.address, beta.address], ["A"], VOTING_PERIOD)).to.be.revertedWith(
        "CenterDAO : autant de noms que de fondateurs"
      );
    });

    it("refuse un fondateur en double", async function () {
      const { CenterDAO, alpha } = await loadFixture(deployFixture);
      await expect(CenterDAO.deploy([alpha.address, alpha.address], ["A", "A bis"], VOTING_PERIOD)).to.be.revertedWith(
        "CenterDAO : fondateur en double"
      );
    });

    it("refuse l'adresse zéro comme fondateur", async function () {
      const { CenterDAO, alpha } = await loadFixture(deployFixture);
      await expect(CenterDAO.deploy([alpha.address, ethers.ZeroAddress], ["A", "Z"], VOTING_PERIOD)).to.be.revertedWith(
        "CenterDAO : adresse de fondateur nulle"
      );
    });

    it("refuse une période de vote nulle", async function () {
      const { CenterDAO, alpha } = await loadFixture(deployFixture);
      await expect(CenterDAO.deploy([alpha.address], ["A"], 0)).to.be.revertedWith(
        "CenterDAO : la période de vote doit être supérieure à 0"
      );
    });

    it("refuse un nom de fondateur vide", async function () {
      const { CenterDAO, alpha } = await loadFixture(deployFixture);
      await expect(CenterDAO.deploy([alpha.address], [""], VOTING_PERIOD)).to.be.revertedWith(
        "CenterDAO : nom de fondateur vide"
      );
    });
  });

  describe("Propositions", function () {
    it("un membre crée une proposition d'ajout (identifiant 0) et ProposalCreated est émis", async function () {
      const { dao, alpha, academy } = await loadFixture(deployFixture);
      await expect(dao.connect(alpha).proposeAdd(academy.address, "Sport Academy"))
        .to.emit(dao, "ProposalCreated")
        .withArgs(0n, ProposalType.Add, academy.address, alpha.address);

      const p = await dao.getProposal(0);
      expect(p.pType).to.equal(ProposalType.Add);
      expect(p.candidate).to.equal(academy.address);
      expect(p.name).to.equal("Sport Academy");
      expect(p.proposer).to.equal(alpha.address);
      expect(p.yesVotes).to.equal(0n);
      expect(p.noVotes).to.equal(0n);
      expect(p.deadline).to.equal(BigInt(await time.latest()) + BigInt(VOTING_PERIOD));
      expect(p.executed).to.equal(false);
      expect(await dao.proposalCount()).to.equal(1n);
      expect(await dao.proposalStatus(0)).to.equal(Status.Pending);
    });

    it("un non-membre ne peut pas proposer", async function () {
      const { dao, outsider, academy, alpha } = await loadFixture(deployFixture);
      await expect(dao.connect(outsider).proposeAdd(academy.address, "Sport Academy")).to.be.revertedWith(
        "CenterDAO : réservé aux centres membres"
      );
      await expect(dao.connect(outsider).proposeRemove(alpha.address)).to.be.revertedWith(
        "CenterDAO : réservé aux centres membres"
      );
    });

    it("refuse un candidat nul, déjà membre ou sans nom", async function () {
      const { dao, alpha, beta, academy } = await loadFixture(deployFixture);
      await expect(dao.connect(alpha).proposeAdd(ethers.ZeroAddress, "X")).to.be.revertedWith(
        "CenterDAO : adresse du candidat nulle"
      );
      await expect(dao.connect(alpha).proposeAdd(beta.address, "Beta")).to.be.revertedWith(
        "CenterDAO : ce centre est déjà membre"
      );
      await expect(dao.connect(alpha).proposeAdd(academy.address, "")).to.be.revertedWith(
        "CenterDAO : le nom du centre est obligatoire"
      );
    });

    it("refuse d'exclure un centre non membre", async function () {
      const { dao, alpha, outsider } = await loadFixture(deployFixture);
      await expect(dao.connect(alpha).proposeRemove(outsider.address)).to.be.revertedWith(
        "CenterDAO : ce centre n'est pas membre"
      );
    });

    it("refuse d'exclure le dernier membre (la DAO ne reste jamais vide)", async function () {
      const { CenterDAO, alpha } = await loadFixture(deployFixture);
      const solo = await CenterDAO.deploy([alpha.address], ["Solo"], VOTING_PERIOD);
      await expect(solo.connect(alpha).proposeRemove(alpha.address)).to.be.revertedWith(
        "CenterDAO : la DAO doit garder au moins un membre"
      );
    });

    it("refuse de lire une proposition inexistante", async function () {
      const { dao } = await loadFixture(deployFixture);
      await expect(dao.getProposal(0)).to.be.revertedWith("CenterDAO : proposition inexistante");
      await expect(dao.proposalStatus(5)).to.be.revertedWith("CenterDAO : proposition inexistante");
    });
  });

  describe("Votes et majorité", function () {
    async function proposalFixture() {
      const ctx = await deployFixture();
      await ctx.dao.connect(ctx.alpha).proposeAdd(ctx.academy.address, "Sport Academy");
      return ctx;
    }

    it("un non-membre ne peut pas voter", async function () {
      const { dao, outsider } = await loadFixture(proposalFixture);
      await expect(dao.connect(outsider).vote(0, true)).to.be.revertedWith("CenterDAO : réservé aux centres membres");
    });

    it("enregistre le vote et émet Voted", async function () {
      const { dao, alpha, beta } = await loadFixture(proposalFixture);
      await expect(dao.connect(alpha).vote(0, true)).to.emit(dao, "Voted").withArgs(0n, alpha.address, true);
      await expect(dao.connect(beta).vote(0, false)).to.emit(dao, "Voted").withArgs(0n, beta.address, false);
      const p = await dao.getProposal(0);
      expect(p.yesVotes).to.equal(1n);
      expect(p.noVotes).to.equal(1n);
      expect(await dao.hasVoted(0, alpha.address)).to.equal(true);
      expect(await dao.hasVoted(0, beta.address)).to.equal(true);
    });

    it("avec 3 membres, 1 vote oui ne suffit pas", async function () {
      const { dao, alpha, academy } = await loadFixture(proposalFixture);
      await dao.connect(alpha).vote(0, true);
      expect(await dao.proposalStatus(0)).to.equal(Status.Pending);
      await expect(dao.execute(0)).to.be.revertedWith("CenterDAO : la majorité n'est pas atteinte");
      expect(await dao.isActiveCenter(academy.address)).to.equal(false);
    });

    it("avec 3 membres, 2 votes oui suffisent et n'importe qui peut exécuter", async function () {
      const { dao, alpha, beta, academy, outsider } = await loadFixture(proposalFixture);
      await dao.connect(alpha).vote(0, true);
      await dao.connect(beta).vote(0, true);
      expect(await dao.proposalStatus(0)).to.equal(Status.Approved);

      await expect(dao.connect(outsider).execute(0))
        .to.emit(dao, "CenterAdded")
        .withArgs(academy.address, "Sport Academy")
        .and.to.emit(dao, "ProposalExecuted")
        .withArgs(0n);

      expect(await dao.isActiveCenter(academy.address)).to.equal(true);
      expect(await dao.memberCount()).to.equal(4n);
      expect((await dao.centers(academy.address)).name).to.equal("Sport Academy");
      expect(await dao.getCenters()).to.include(academy.address);
      expect(await dao.proposalStatus(0)).to.equal(Status.Executed);
    });

    it("des votes non ne permettent pas l'approbation", async function () {
      const { dao, alpha, beta, gamma } = await loadFixture(proposalFixture);
      await dao.connect(alpha).vote(0, true);
      await dao.connect(beta).vote(0, false);
      await dao.connect(gamma).vote(0, false);
      await expect(dao.execute(0)).to.be.revertedWith("CenterDAO : la majorité n'est pas atteinte");
    });

    it("on ne peut pas voter deux fois", async function () {
      const { dao, alpha } = await loadFixture(proposalFixture);
      await dao.connect(alpha).vote(0, true);
      await expect(dao.connect(alpha).vote(0, true)).to.be.revertedWith("CenterDAO : vous avez déjà voté");
      await expect(dao.connect(alpha).vote(0, false)).to.be.revertedWith("CenterDAO : vous avez déjà voté");
    });

    it("on ne peut pas voter après la date limite", async function () {
      const { dao, alpha } = await loadFixture(proposalFixture);
      await time.increase(VOTING_PERIOD + 1);
      await expect(dao.connect(alpha).vote(0, true)).to.be.revertedWith("CenterDAO : la période de vote est terminée");
    });

    it("une proposition sans majorité est rejetée après la date limite", async function () {
      const { dao, alpha } = await loadFixture(proposalFixture);
      await dao.connect(alpha).vote(0, true);
      await time.increase(VOTING_PERIOD + 1);
      expect(await dao.proposalStatus(0)).to.equal(Status.Rejected);
      await expect(dao.execute(0)).to.be.revertedWith("CenterDAO : la majorité n'est pas atteinte");
    });

    it("une proposition approuvée reste exécutable après la date limite", async function () {
      const { dao, alpha, beta, academy } = await loadFixture(proposalFixture);
      await dao.connect(alpha).vote(0, true);
      await dao.connect(beta).vote(0, true);
      await time.increase(VOTING_PERIOD + 1);
      expect(await dao.proposalStatus(0)).to.equal(Status.Approved);
      await dao.execute(0);
      expect(await dao.isActiveCenter(academy.address)).to.equal(true);
    });

    it("refuse de voter sur une proposition inexistante", async function () {
      const { dao, alpha } = await loadFixture(proposalFixture);
      await expect(dao.connect(alpha).vote(1, true)).to.be.revertedWith("CenterDAO : proposition inexistante");
    });
  });

  describe("Exclusion", function () {
    it("exclut un centre après un vote majoritaire (le centre visé ne compte pas)", async function () {
      // 4 membres : Alpha, Beta, Gamma, Sport Academy. Exclusion de Gamma → 3 votants éligibles, 2 oui suffisent.
      const { dao, alpha, beta, gamma } = await loadFixture(withAcademyFixture);
      await expect(dao.connect(alpha).proposeRemove(gamma.address))
        .to.emit(dao, "ProposalCreated")
        .withArgs(1n, ProposalType.Remove, gamma.address, alpha.address);
      expect((await dao.getProposal(1)).name).to.equal("Centre Gamma");

      await dao.connect(alpha).vote(1, true);
      expect(await dao.proposalStatus(1)).to.equal(Status.Pending);
      await dao.connect(beta).vote(1, true);
      expect(await dao.proposalStatus(1)).to.equal(Status.Approved);

      await expect(dao.execute(1))
        .to.emit(dao, "CenterRemoved")
        .withArgs(gamma.address)
        .and.to.emit(dao, "ProposalExecuted")
        .withArgs(1n);

      expect(await dao.isActiveCenter(gamma.address)).to.equal(false);
      expect(await dao.memberCount()).to.equal(3n);
      const center = await dao.centers(gamma.address);
      expect(center.active).to.equal(false);
      expect(center.name).to.equal("Centre Gamma");
      // L'adresse reste dans la liste, sans doublon
      expect(await dao.getCenters()).to.have.lengthOf(4);
    });

    it("un centre ne peut pas voter sur sa propre exclusion", async function () {
      const { dao, alpha, gamma } = await loadFixture(deployFixture);
      await dao.connect(alpha).proposeRemove(gamma.address);
      await expect(dao.connect(gamma).vote(0, false)).to.be.revertedWith(
        "CenterDAO : un centre ne vote pas sur sa propre exclusion"
      );
    });

    it("avec 3 membres, l'exclusion de l'un demande 2 votes oui sur 2 éligibles", async function () {
      const { dao, alpha, beta, gamma } = await loadFixture(deployFixture);
      await dao.connect(alpha).proposeRemove(gamma.address);
      await dao.connect(alpha).vote(0, true);
      // 1 oui sur 2 éligibles : pas plus de la moitié
      expect(await dao.proposalStatus(0)).to.equal(Status.Pending);
      await dao.connect(beta).vote(0, true);
      expect(await dao.proposalStatus(0)).to.equal(Status.Approved);
      await dao.execute(0);
      expect(await dao.isActiveCenter(gamma.address)).to.equal(false);
    });

    it("le centre exclu ne peut plus proposer ni voter", async function () {
      const { dao, alpha, beta, gamma, outsider } = await loadFixture(deployFixture);
      await dao.connect(alpha).proposeRemove(gamma.address);
      await dao.connect(alpha).vote(0, true);
      await dao.connect(beta).vote(0, true);
      await dao.execute(0);

      await expect(dao.connect(gamma).proposeAdd(outsider.address, "Nouveau")).to.be.revertedWith(
        "CenterDAO : réservé aux centres membres"
      );
      await dao.connect(alpha).proposeAdd(outsider.address, "Nouveau");
      await expect(dao.connect(gamma).vote(1, true)).to.be.revertedWith("CenterDAO : réservé aux centres membres");
    });

    it("un centre exclu peut être ré-admis par un nouveau vote, sans doublon dans la liste", async function () {
      const { dao, alpha, beta, gamma } = await loadFixture(deployFixture);
      await dao.connect(alpha).proposeRemove(gamma.address);
      await dao.connect(alpha).vote(0, true);
      await dao.connect(beta).vote(0, true);
      await dao.execute(0);

      await dao.connect(alpha).proposeAdd(gamma.address, "Centre Gamma");
      await dao.connect(alpha).vote(1, true);
      await dao.connect(beta).vote(1, true);
      await dao.execute(1);

      expect(await dao.isActiveCenter(gamma.address)).to.equal(true);
      expect(await dao.memberCount()).to.equal(3n);
      expect(await dao.getCenters()).to.have.lengthOf(3);
    });

    it("revérifie les conditions : une exclusion devenue sans objet n'est pas appliquée", async function () {
      // Deux propositions d'exclusion de Gamma : la seconde ne peut plus s'exécuter
      const { dao, alpha, beta, gamma } = await loadFixture(withAcademyFixture);
      await dao.connect(alpha).proposeRemove(gamma.address); // id 1
      await dao.connect(beta).proposeRemove(gamma.address); // id 2
      for (const id of [1, 2]) {
        await dao.connect(alpha).vote(id, true);
        await dao.connect(beta).vote(id, true);
      }
      await dao.execute(1);
      await expect(dao.execute(2)).to.be.revertedWith("CenterDAO : ce centre n'est plus membre");
    });
  });

  describe("Exécution", function () {
    it("une proposition ne peut pas être exécutée deux fois", async function () {
      const { dao } = await loadFixture(withAcademyFixture);
      await expect(dao.execute(0)).to.be.revertedWith("CenterDAO : proposition déjà exécutée");
    });

    it("on ne peut plus voter sur une proposition exécutée", async function () {
      const { dao, gamma } = await loadFixture(withAcademyFixture);
      await expect(dao.connect(gamma).vote(0, true)).to.be.revertedWith("CenterDAO : proposition déjà exécutée");
    });

    it("revérifie les conditions : un ajout devenu sans objet n'est pas appliqué", async function () {
      // 3 oui sur la proposition 1 : elle reste majoritaire même après l'arrivée du 4e membre
      const { dao, alpha, beta, gamma, academy } = await loadFixture(deployFixture);
      await dao.connect(alpha).proposeAdd(academy.address, "Sport Academy"); // id 0
      await dao.connect(beta).proposeAdd(academy.address, "Sport Academy bis"); // id 1
      for (const id of [0, 1]) {
        await dao.connect(alpha).vote(id, true);
        await dao.connect(beta).vote(id, true);
      }
      await dao.connect(gamma).vote(1, true);
      await dao.execute(0);
      expect(await dao.proposalStatus(1)).to.equal(Status.Approved);
      await expect(dao.execute(1)).to.be.revertedWith("CenterDAO : ce centre est déjà membre");
    });

    it("refuse d'exécuter une proposition inexistante", async function () {
      const { dao } = await loadFixture(deployFixture);
      await expect(dao.execute(0)).to.be.revertedWith("CenterDAO : proposition inexistante");
    });
  });
});
