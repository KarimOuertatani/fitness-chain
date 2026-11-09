const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const ftc = (value) => ethers.parseUnits(value, 18);

describe("FitCoin", function () {
  async function deployFixture() {
    const [owner, alice, bob, minter, other] = await ethers.getSigners();
    const FitCoin = await ethers.getContractFactory("FitCoin");
    const fitCoin = await FitCoin.deploy();
    await fitCoin.waitForDeployment();
    return { fitCoin, owner, alice, bob, minter, other };
  }

  describe("Déploiement", function () {
    it("a le nom « FitCoin », le symbole « FTC » et 18 décimales", async function () {
      const { fitCoin } = await loadFixture(deployFixture);
      expect(await fitCoin.name()).to.equal("FitCoin");
      expect(await fitCoin.symbol()).to.equal("FTC");
      expect(await fitCoin.decimals()).to.equal(18n);
    });

    it("ne crée aucun FTC au déploiement", async function () {
      const { fitCoin, owner } = await loadFixture(deployFixture);
      expect(await fitCoin.totalSupply()).to.equal(0n);
      expect(await fitCoin.balanceOf(owner.address)).to.equal(0n);
    });

    it("définit le déployeur comme propriétaire et RATE = 10 000", async function () {
      const { fitCoin, owner } = await loadFixture(deployFixture);
      expect(await fitCoin.owner()).to.equal(owner.address);
      expect(await fitCoin.RATE()).to.equal(10_000n);
    });
  });

  describe("Achat de FTC", function () {
    it("donne 10 000 FTC pour 1 ETH avec buyTokens()", async function () {
      const { fitCoin, alice } = await loadFixture(deployFixture);
      await fitCoin.connect(alice).buyTokens({ value: ethers.parseEther("1") });
      expect(await fitCoin.balanceOf(alice.address)).to.equal(ftc("10000"));
      expect(await fitCoin.totalSupply()).to.equal(ftc("10000"));
    });

    it("donne 300 FTC pour 0,03 ETH et émet TokensPurchased", async function () {
      const { fitCoin, alice } = await loadFixture(deployFixture);
      const value = ethers.parseEther("0.03");
      await expect(fitCoin.connect(alice).buyTokens({ value }))
        .to.emit(fitCoin, "TokensPurchased")
        .withArgs(alice.address, value, ftc("300"));
      expect(await fitCoin.balanceOf(alice.address)).to.equal(ftc("300"));
    });

    it("garde l'ETH des ventes dans le contrat", async function () {
      const { fitCoin, alice } = await loadFixture(deployFixture);
      const value = ethers.parseEther("0.5");
      await expect(fitCoin.connect(alice).buyTokens({ value })).to.changeEtherBalances(
        [alice, fitCoin],
        [-value, value]
      );
    });

    it("accepte un envoi d'ETH direct au contrat (receive)", async function () {
      const { fitCoin, bob } = await loadFixture(deployFixture);
      const value = ethers.parseEther("0.02");
      await expect(bob.sendTransaction({ to: await fitCoin.getAddress(), value }))
        .to.emit(fitCoin, "TokensPurchased")
        .withArgs(bob.address, value, ftc("200"));
      expect(await fitCoin.balanceOf(bob.address)).to.equal(ftc("200"));
    });

    it("refuse un achat sans ETH", async function () {
      const { fitCoin, alice } = await loadFixture(deployFixture);
      await expect(fitCoin.connect(alice).buyTokens({ value: 0 })).to.be.revertedWith(
        "FitCoin : envoyez de l'ETH pour acheter des FTC"
      );
    });

    it("refuse un envoi direct sans ETH", async function () {
      const { fitCoin, alice } = await loadFixture(deployFixture);
      await expect(alice.sendTransaction({ to: await fitCoin.getAddress(), value: 0 })).to.be.revertedWith(
        "FitCoin : envoyez de l'ETH pour acheter des FTC"
      );
    });

    it("previewPurchase renvoie weiAmount × RATE", async function () {
      const { fitCoin } = await loadFixture(deployFixture);
      expect(await fitCoin.previewPurchase(ethers.parseEther("0.03"))).to.equal(ftc("300"));
      expect(await fitCoin.previewPurchase(1n)).to.equal(10_000n);
      expect(await fitCoin.previewPurchase(0n)).to.equal(0n);
    });
  });

  describe("Gestion des minters", function () {
    it("permet au propriétaire d'ajouter puis de retirer un minter", async function () {
      const { fitCoin, owner, minter } = await loadFixture(deployFixture);
      expect(await fitCoin.isMinter(minter.address)).to.equal(false);

      await expect(fitCoin.connect(owner).setMinter(minter.address, true))
        .to.emit(fitCoin, "MinterUpdated")
        .withArgs(minter.address, true);
      expect(await fitCoin.isMinter(minter.address)).to.equal(true);

      await expect(fitCoin.connect(owner).setMinter(minter.address, false))
        .to.emit(fitCoin, "MinterUpdated")
        .withArgs(minter.address, false);
      expect(await fitCoin.isMinter(minter.address)).to.equal(false);
    });

    it("refuse qu'un non-propriétaire gère les minters", async function () {
      const { fitCoin, alice, minter } = await loadFixture(deployFixture);
      await expect(fitCoin.connect(alice).setMinter(minter.address, true))
        .to.be.revertedWithCustomError(fitCoin, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });

    it("refuse l'adresse nulle comme minter", async function () {
      const { fitCoin, owner } = await loadFixture(deployFixture);
      await expect(fitCoin.connect(owner).setMinter(ethers.ZeroAddress, true)).to.be.revertedWith(
        "FitCoin : adresse du minter nulle"
      );
    });

    it("empêche le propriétaire de se déclarer minter", async function () {
      const { fitCoin, owner } = await loadFixture(deployFixture);
      await expect(fitCoin.connect(owner).setMinter(owner.address, true)).to.be.revertedWith(
        "FitCoin : le propriétaire ne peut pas être minter"
      );
    });

    it("empêche de transférer la propriété à un minter", async function () {
      const { fitCoin, owner, minter } = await loadFixture(deployFixture);
      await fitCoin.connect(owner).setMinter(minter.address, true);
      await expect(fitCoin.connect(owner).transferOwnership(minter.address)).to.be.revertedWith(
        "FitCoin : le nouveau propriétaire est un minter"
      );
    });
  });

  describe("Création de FTC (mint)", function () {
    it("permet à un minter de créer des FTC", async function () {
      const { fitCoin, owner, minter, alice } = await loadFixture(deployFixture);
      await fitCoin.connect(owner).setMinter(minter.address, true);
      await expect(fitCoin.connect(minter).mint(alice.address, ftc("50")))
        .to.emit(fitCoin, "Transfer")
        .withArgs(ethers.ZeroAddress, alice.address, ftc("50"));
      expect(await fitCoin.balanceOf(alice.address)).to.equal(ftc("50"));
      expect(await fitCoin.totalSupply()).to.equal(ftc("50"));
    });

    it("refuse que le propriétaire crée des FTC", async function () {
      const { fitCoin, owner } = await loadFixture(deployFixture);
      await expect(fitCoin.connect(owner).mint(owner.address, ftc("1"))).to.be.revertedWith(
        "FitCoin : seul un minter peut créer des FTC"
      );
    });

    it("refuse qu'une adresse quelconque crée des FTC", async function () {
      const { fitCoin, alice } = await loadFixture(deployFixture);
      await expect(fitCoin.connect(alice).mint(alice.address, ftc("1"))).to.be.revertedWith(
        "FitCoin : seul un minter peut créer des FTC"
      );
    });

    it("refuse qu'un minter retiré crée encore des FTC", async function () {
      const { fitCoin, owner, minter, alice } = await loadFixture(deployFixture);
      await fitCoin.connect(owner).setMinter(minter.address, true);
      await fitCoin.connect(owner).setMinter(minter.address, false);
      await expect(fitCoin.connect(minter).mint(alice.address, ftc("1"))).to.be.revertedWith(
        "FitCoin : seul un minter peut créer des FTC"
      );
    });
  });

  describe("Retrait de l'ETH", function () {
    it("envoie tout l'ETH des ventes au propriétaire et émet Withdrawn", async function () {
      const { fitCoin, owner, alice, bob } = await loadFixture(deployFixture);
      await fitCoin.connect(alice).buyTokens({ value: ethers.parseEther("0.03") });
      await fitCoin.connect(bob).buyTokens({ value: ethers.parseEther("0.02") });
      const total = ethers.parseEther("0.05");

      await expect(fitCoin.connect(owner).withdraw())
        .to.emit(fitCoin, "Withdrawn")
        .withArgs(owner.address, total);
      expect(await ethers.provider.getBalance(await fitCoin.getAddress())).to.equal(0n);
    });

    it("crédite le propriétaire du montant retiré", async function () {
      const { fitCoin, owner, alice } = await loadFixture(deployFixture);
      const value = ethers.parseEther("1");
      await fitCoin.connect(alice).buyTokens({ value });
      await expect(fitCoin.connect(owner).withdraw()).to.changeEtherBalances([fitCoin, owner], [-value, value]);
    });

    it("refuse qu'un non-propriétaire retire l'ETH", async function () {
      const { fitCoin, alice } = await loadFixture(deployFixture);
      await fitCoin.connect(alice).buyTokens({ value: ethers.parseEther("1") });
      await expect(fitCoin.connect(alice).withdraw())
        .to.be.revertedWithCustomError(fitCoin, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });

    it("refuse un retrait quand il n'y a pas d'ETH", async function () {
      const { fitCoin, owner } = await loadFixture(deployFixture);
      await expect(fitCoin.connect(owner).withdraw()).to.be.revertedWith("FitCoin : aucun ETH à retirer");
    });

    it("ne change pas les soldes FTC lors du retrait", async function () {
      const { fitCoin, owner, alice } = await loadFixture(deployFixture);
      await fitCoin.connect(alice).buyTokens({ value: ethers.parseEther("1") });
      await fitCoin.connect(owner).withdraw();
      expect(await fitCoin.balanceOf(alice.address)).to.equal(ftc("10000"));
      expect(await fitCoin.balanceOf(owner.address)).to.equal(0n);
    });
  });

  describe("Transferts ERC-20", function () {
    async function withBalanceFixture() {
      const ctx = await deployFixture();
      await ctx.fitCoin.connect(ctx.alice).buyTokens({ value: ethers.parseEther("0.01") }); // 100 FTC
      return ctx;
    }

    it("transfer déplace des FTC et émet Transfer", async function () {
      const { fitCoin, alice, bob } = await loadFixture(withBalanceFixture);
      await expect(fitCoin.connect(alice).transfer(bob.address, ftc("40")))
        .to.emit(fitCoin, "Transfer")
        .withArgs(alice.address, bob.address, ftc("40"));
      expect(await fitCoin.balanceOf(alice.address)).to.equal(ftc("60"));
      expect(await fitCoin.balanceOf(bob.address)).to.equal(ftc("40"));
    });

    it("transfer refuse un montant supérieur au solde", async function () {
      const { fitCoin, alice, bob } = await loadFixture(withBalanceFixture);
      await expect(fitCoin.connect(alice).transfer(bob.address, ftc("101")))
        .to.be.revertedWithCustomError(fitCoin, "ERC20InsufficientBalance")
        .withArgs(alice.address, ftc("100"), ftc("101"));
    });

    it("approve fixe l'autorisation et émet Approval", async function () {
      const { fitCoin, alice, bob } = await loadFixture(withBalanceFixture);
      await expect(fitCoin.connect(alice).approve(bob.address, ftc("30")))
        .to.emit(fitCoin, "Approval")
        .withArgs(alice.address, bob.address, ftc("30"));
      expect(await fitCoin.allowance(alice.address, bob.address)).to.equal(ftc("30"));
    });

    it("transferFrom utilise l'autorisation et la diminue", async function () {
      const { fitCoin, alice, bob, other } = await loadFixture(withBalanceFixture);
      await fitCoin.connect(alice).approve(bob.address, ftc("30"));
      await fitCoin.connect(bob).transferFrom(alice.address, other.address, ftc("20"));
      expect(await fitCoin.balanceOf(other.address)).to.equal(ftc("20"));
      expect(await fitCoin.balanceOf(alice.address)).to.equal(ftc("80"));
      expect(await fitCoin.allowance(alice.address, bob.address)).to.equal(ftc("10"));
    });
  });

  describe("Protection des FTC d'autrui", function () {
    async function withBalanceFixture() {
      const ctx = await deployFixture();
      await ctx.fitCoin.connect(ctx.alice).buyTokens({ value: ethers.parseEther("0.01") }); // 100 FTC
      return ctx;
    }

    it("personne ne peut prendre les FTC d'un autre sans autorisation", async function () {
      const { fitCoin, alice, bob } = await loadFixture(withBalanceFixture);
      await expect(fitCoin.connect(bob).transferFrom(alice.address, bob.address, ftc("1")))
        .to.be.revertedWithCustomError(fitCoin, "ERC20InsufficientAllowance")
        .withArgs(bob.address, 0n, ftc("1"));
    });

    it("on ne peut pas dépasser l'autorisation accordée", async function () {
      const { fitCoin, alice, bob } = await loadFixture(withBalanceFixture);
      await fitCoin.connect(alice).approve(bob.address, ftc("10"));
      await expect(fitCoin.connect(bob).transferFrom(alice.address, bob.address, ftc("11")))
        .to.be.revertedWithCustomError(fitCoin, "ERC20InsufficientAllowance")
        .withArgs(bob.address, ftc("10"), ftc("11"));
    });

    it("le propriétaire du contrat ne peut pas prendre les FTC d'un utilisateur", async function () {
      const { fitCoin, owner, alice } = await loadFixture(withBalanceFixture);
      await expect(fitCoin.connect(owner).transferFrom(alice.address, owner.address, ftc("1")))
        .to.be.revertedWithCustomError(fitCoin, "ERC20InsufficientAllowance");
      expect(await fitCoin.balanceOf(alice.address)).to.equal(ftc("100"));
    });

    it("une autorisation retirée (approve à 0) bloque transferFrom", async function () {
      const { fitCoin, alice, bob } = await loadFixture(withBalanceFixture);
      await fitCoin.connect(alice).approve(bob.address, ftc("10"));
      await fitCoin.connect(alice).approve(bob.address, 0n);
      await expect(fitCoin.connect(bob).transferFrom(alice.address, bob.address, ftc("1")))
        .to.be.revertedWithCustomError(fitCoin, "ERC20InsufficientAllowance");
    });
  });
});
