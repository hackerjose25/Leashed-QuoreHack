const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const usd = (n) => ethers.parseUnits(String(n), 6);
const memo = ethers.id("invoice-001");
const DESIGN = ethers.encodeBytes32String("design");
const PQC = "0x0000000000000000000000000000000000000A02";

// Install the mock pqcKeyStatus precompile at its real address and return a handle to it.
async function installPqc() {
  const mock = await (await ethers.getContractFactory("MockPqcKeyStatus")).deploy();
  const code = await ethers.provider.getCode(mock.target);
  await ethers.provider.send("hardhat_setCode", [PQC, code]);
  return ethers.getContractAt("MockPqcKeyStatus", PQC);
}

describe("LeashedVault", () => {
  let token, vault, owner, agent, acme, attacker, pqc;

  beforeEach(async () => {
    [owner, agent, acme, attacker] = await ethers.getSigners();
    pqc = await installPqc();
    await pqc.set(owner.address, true);
    await pqc.set(agent.address, true);
    token = await (await ethers.getContractFactory("MockUSD")).deploy();
    // perTxCap 1000, dailyCap 2000, approval above 500
    vault = await (await ethers.getContractFactory("LeashedVault")).deploy(
      token.target, agent.address, usd(1000), usd(2000), usd(500)
    );
    await token.mint(vault.target, usd(50000));
    await vault.setVendor(acme.address, true, usd(500), DESIGN, "Acme Design");
  });

  describe("autonomous payments", () => {
    it("pays an approved vendor within policy", async () => {
      await expect(vault.connect(agent).pay(acme.address, usd(450), memo))
        .to.emit(vault, "Paid");
      expect(await token.balanceOf(acme.address)).to.equal(usd(450));
      expect(await vault.spentToday()).to.equal(usd(450));
    });

    it("blocks prompt-injection payment to unknown wallet", async () => {
      await expect(vault.connect(agent).pay(attacker.address, usd(100), memo))
        .to.be.revertedWithCustomError(vault, "VendorNotApproved");
    });

    it("blocks amounts above approval threshold", async () => {
      await expect(vault.connect(agent).pay(acme.address, usd(50000), memo))
        .to.be.revertedWithCustomError(vault, "NeedsApproval");
    });

    it("enforces vendor cap", async () => {
      await vault.setPolicy(usd(1000), usd(2000), usd(1000));
      await expect(vault.connect(agent).pay(acme.address, usd(600), memo))
        .to.be.revertedWithCustomError(vault, "OverVendorCap");
    });

    it("enforces daily cap and resets next day", async () => {
      await vault.setVendor(acme.address, true, usd(2000), DESIGN, "Acme Design");
      for (let i = 0; i < 4; i++) await vault.connect(agent).pay(acme.address, usd(500), memo);
      await expect(vault.connect(agent).pay(acme.address, usd(1), memo))
        .to.be.revertedWithCustomError(vault, "OverDailyCap");
      await time.increase(86400);
      await expect(vault.connect(agent).pay(acme.address, usd(1), memo)).to.emit(vault, "Paid");
    });

    it("rejects zero amount", async () => {
      await expect(vault.connect(agent).pay(acme.address, 0, memo))
        .to.be.revertedWithCustomError(vault, "ZeroAmount");
    });
  });

  describe("agent cannot escalate", () => {
    it("cannot change policy, vendors, operator, pause or withdraw", async () => {
      const a = vault.connect(agent);
      await expect(a.setPolicy(1, 1, 1)).to.be.revertedWithCustomError(vault, "NotOwner");
      await expect(a.setVendor(attacker.address, true, usd(1e6), DESIGN, "x"))
        .to.be.revertedWithCustomError(vault, "NotOwner");
      await expect(a.setOperator(attacker.address)).to.be.revertedWithCustomError(vault, "NotOwner");
      await expect(a.setPaused(false)).to.be.revertedWithCustomError(vault, "NotOwner");
      await expect(a.withdraw(attacker.address, 1)).to.be.revertedWithCustomError(vault, "NotOwner");
      await expect(a.approve(0)).to.be.revertedWithCustomError(vault, "NotOwner");
      await expect(a.transferOwnership(attacker.address)).to.be.revertedWithCustomError(vault, "NotOwner");
    });

    it("non-operator cannot pay", async () => {
      await expect(vault.connect(attacker).pay(acme.address, usd(1), memo))
        .to.be.revertedWithCustomError(vault, "NotOperator");
    });
  });

  describe("approval flow", () => {
    beforeEach(async () => {
      await vault.setVendor(acme.address, true, usd(500), DESIGN, "Acme Design");
    });

    it("request -> owner approve -> execute", async () => {
      await expect(vault.connect(agent).request(acme.address, usd(1500), memo)).to.emit(vault, "Requested");
      await expect(vault.connect(agent).executeApproved(0)).to.be.revertedWithCustomError(vault, "NotApproved");
      await vault.approve(0);
      await expect(vault.connect(agent).executeApproved(0)).to.emit(vault, "Paid");
      expect(await token.balanceOf(acme.address)).to.equal(usd(1500));
      await expect(vault.connect(agent).executeApproved(0)).to.be.revertedWithCustomError(vault, "AlreadyExecuted");
    });

    it("request must be above threshold and to a vendor", async () => {
      await expect(vault.connect(agent).request(acme.address, usd(100), memo))
        .to.be.revertedWithCustomError(vault, "UnderThreshold");
      await expect(vault.connect(agent).request(attacker.address, usd(1500), memo))
        .to.be.revertedWithCustomError(vault, "VendorNotApproved");
    });

    it("approved request still respects daily cap", async () => {
      await vault.connect(agent).request(acme.address, usd(2500), memo);
      await vault.approve(0);
      await expect(vault.connect(agent).executeApproved(0)).to.be.revertedWithCustomError(vault, "OverDailyCap");
    });

    it("expired request cannot be approved or executed", async () => {
      await vault.connect(agent).request(acme.address, usd(1500), memo);
      await time.increase(3 * 86400 + 1);
      await expect(vault.approve(0)).to.be.revertedWithCustomError(vault, "RequestExpired");
    });

    it("bad request id", async () => {
      await expect(vault.approve(9)).to.be.revertedWithCustomError(vault, "BadRequest");
    });
  });

  describe("emergency pause", () => {
    it("freezes agent spending, owner can still withdraw", async () => {
      await vault.setPaused(true);
      await expect(vault.connect(agent).pay(acme.address, usd(1), memo))
        .to.be.revertedWithCustomError(vault, "Paused");
      await vault.withdraw(owner.address, usd(100));
      expect(await token.balanceOf(owner.address)).to.equal(usd(100));
    });
  });
  describe("post-quantum key check (pqcKeyStatus precompile)", () => {
    it("reads registration from the precompile", async () => {
      expect(await vault.isPqcRegistered(agent.address)).to.equal(true);
      expect(await vault.isPqcRegistered(attacker.address)).to.equal(false);
    });

    it("cannot be deployed with an operator that has no PQC key", async () => {
      const F = await ethers.getContractFactory("LeashedVault");
      await expect(F.deploy(token.target, attacker.address, usd(1000), usd(2000), usd(500)))
        .to.be.revertedWithCustomError(vault, "NoPqcKey").withArgs(attacker.address);
    });

    it("operator cannot spend once its PQC key is gone", async () => {
      await pqc.set(agent.address, false);
      await expect(vault.connect(agent).pay(acme.address, usd(10), memo))
        .to.be.revertedWithCustomError(vault, "NoPqcKey").withArgs(agent.address);
      await expect(vault.connect(agent).request(acme.address, usd(600), memo))
        .to.be.revertedWithCustomError(vault, "NoPqcKey");
    });

    it("owner can only appoint an operator with a PQC key", async () => {
      await expect(vault.setOperator(attacker.address))
        .to.be.revertedWithCustomError(vault, "NoPqcKey").withArgs(attacker.address);
      await pqc.set(attacker.address, true);
      await expect(vault.setOperator(attacker.address)).to.emit(vault, "OperatorChanged");
    });
  });
});
