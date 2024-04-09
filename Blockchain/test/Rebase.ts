import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ZeroAddress, parseEther } from "ethers";
import hre from "hardhat";

const INITAL_ETHER_PRICE = 336031n;

describe("WeiUsdOracle", function () {
  async function deployFixture() {
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const WeiUsdOracleContract = await hre.ethers.getContractFactory(
      "WeiUsdOracle"
    );
    const RebaseContract = await hre.ethers.getContractFactory("Rebase");
    const UsdEthContract = await hre.ethers.getContractFactory("UsdEth");

    const WeiUsdOracle = await WeiUsdOracleContract.deploy(INITAL_ETHER_PRICE);
    const UsdEth = await UsdEthContract.deploy();

    const Rebase = await RebaseContract.deploy(
      await UsdEth.getAddress(),
      await WeiUsdOracle.getAddress()
    );

    await WeiUsdOracle.subscribe(await Rebase.getAddress());
    await UsdEth.setRebaseAddress(await Rebase.getAddress());

    const weiPerPenny = await WeiUsdOracle.getWeiRatio();

    await Rebase.initialize(weiPerPenny, {
      value: parseEther("1000"),
    });

    await Rebase.unpause();

    return { WeiUsdOracle, owner, Rebase, otherAccount, UsdEth };
  }

  it("Should deploy the  contract", async function () {
    const { Rebase } = await loadFixture(deployFixture);
    expect(await Rebase.getAddress()).to.not.be.undefined;
  });

  it("Should initialize", async function () {
    const { Rebase, WeiUsdOracle } = await loadFixture(deployFixture);
    const weiPerPenny = await WeiUsdOracle.getWeiRatio();
    await Rebase.initialize(weiPerPenny, {
      value: parseEther("1000"),
    });
  });

  it("Should NOT initialize (NOT OWNER)", async function () {
    const { Rebase, WeiUsdOracle, otherAccount } = await loadFixture(
      deployFixture
    );
    const instance = Rebase.connect(otherAccount);
    const weiPerPenny = await WeiUsdOracle.getWeiRatio();
    await expect(
      instance.initialize(weiPerPenny, {
        value: parseEther("1000"),
      })
    ).to.be.revertedWithCustomError(Rebase, "OwnableUnauthorizedAccount");
  });

  it("Should NOT initialize (INVALID WEIS PER PENNY)", async function () {
    const { Rebase } = await loadFixture(deployFixture);
    await expect(
      Rebase.initialize(0n, {
        value: parseEther("1000"),
      })
    ).to.be.revertedWith("Invalid weisPerPenny");
  });
  it("Should NOT initialize (INVALID VALUE)", async function () {
    const { Rebase, WeiUsdOracle } = await loadFixture(deployFixture);
    const weiPerPenny = await WeiUsdOracle.getWeiRatio();
    await expect(
      Rebase.initialize(weiPerPenny, {
        value: 0,
      })
    ).to.be.revertedWith("Invalid msg.value");
  });

  it("Should pause", async function () {
    const { Rebase } = await loadFixture(deployFixture);
    await Rebase.pause();
  });

  it("Should NOT pause (NOT OWNER)", async function () {
    const { Rebase, otherAccount } = await loadFixture(deployFixture);
    const instance = Rebase.connect(otherAccount);
    await expect(instance.pause()).to.be.revertedWithCustomError(
      Rebase,
      "OwnableUnauthorizedAccount"
    );
  });

  it("Should unpause", async function () {
    const { Rebase } = await loadFixture(deployFixture);
    await Rebase.pause();
    await expect(Rebase.unpause()).to.not.be.reverted;
  });

  it("Should NOT unpause (NOT OWNER)", async function () {
    const { Rebase, otherAccount } = await loadFixture(deployFixture);
    const instance = Rebase.connect(otherAccount);
    await expect(instance.unpause()).to.be.revertedWithCustomError(
      Rebase,
      "OwnableUnauthorizedAccount"
    );
  });

  it("Should change oracle address", async function () {
    const { Rebase, WeiUsdOracle } = await loadFixture(deployFixture);
    await expect(Rebase.setOracleAddress(await WeiUsdOracle.getAddress())).to
      .not.be.reverted;
  });

  it("Should NOT change oracle address (NOT OWNER)", async function () {
    const { Rebase, WeiUsdOracle, otherAccount } = await loadFixture(
      deployFixture
    );
    const instance = Rebase.connect(otherAccount);
    await expect(
      instance.setOracleAddress(await WeiUsdOracle.getAddress())
    ).to.be.revertedWithCustomError(Rebase, "OwnableUnauthorizedAccount");
  });

  it("Should NOT change oracle address (INVALID ADDRESS)", async function () {
    const { Rebase } = await loadFixture(deployFixture);
    await expect(Rebase.setOracleAddress(ZeroAddress)).to.be.revertedWith(
      "Invalid newOracle"
    );
  });

  it("Should update tolerance", async function () {
    const { Rebase } = await loadFixture(deployFixture);
    await expect(Rebase.setUpdateTolerance(100n)).to.not.be.reverted;
  });
  it("Should NOT update tolerance (NOT OWNER)", async function () {
    const { Rebase, otherAccount } = await loadFixture(deployFixture);
    const instance = Rebase.connect(otherAccount);
    await expect(
      instance.setUpdateTolerance(100n)
    ).to.be.revertedWithCustomError(Rebase, "OwnableUnauthorizedAccount");
  });
  it("Should NOT update tolerance (INVALID TOLERANCE)", async function () {
    const { Rebase } = await loadFixture(deployFixture);
    await expect(Rebase.setUpdateTolerance(0n)).to.be.revertedWith(
      "Invalid newTolrance"
    );
  });

  it("Should deposit", async function () {
    const { Rebase, otherAccount } = await loadFixture(deployFixture);
    const instace = Rebase.connect(otherAccount);
    expect(await instace.deposit({ value: parseEther("1000") }))
      .to.emit(Rebase, "Transfer")
      .withArgs(await otherAccount.getAddress(), parseEther("1000"));
  });

  it("Should NOT deposit (INVALID VALUE)", async function () {
    const { Rebase, otherAccount } = await loadFixture(deployFixture);
    const instace = Rebase.connect(otherAccount);
    await expect(instace.deposit({ value: 0 })).to.be.revertedWith(
      "With this amount you can't buy any USD cents"
    );
  });
  it("Should NOT deposit (NOT UPDATED)", async function () {
    const { Rebase, otherAccount } = await loadFixture(deployFixture);
    await Rebase.setUpdateTolerance(1n);
    const instace = Rebase.connect(otherAccount);
    await expect(
      instace.deposit({ value: parseEther("1000") })
    ).to.be.revertedWith("Outdated");
  });

  it("Should NOT deposit (PAUSED)", async function () {
    const { Rebase, otherAccount } = await loadFixture(deployFixture);
    await Rebase.pause();
    const instace = Rebase.connect(otherAccount);
    await expect(
      instace.deposit({ value: parseEther("1000") })
    ).to.be.revertedWithCustomError(Rebase, "EnforcedPause");
  });

  it("Should withdraw in ETH", async function () {
    const { Rebase, otherAccount } = await loadFixture(deployFixture);
    const instace = Rebase.connect(otherAccount);
    await instace.deposit({ value: parseEther("1000") });
    expect(await instace.withdrawInEth(parseEther("999"))).to.emit(
      Rebase,
      "Transfer"
    );
  });

  it("Should NOT withdraw in ETH (NOT ENOUGH BALANCE)", async function () {
    const { Rebase, otherAccount } = await loadFixture(deployFixture);
    const instace = Rebase.connect(otherAccount);
    await instace.deposit({ value: parseEther("1000") });
    await expect(instace.withdrawInEth(parseEther("1001"))).to.be.revertedWith(
      "Not enough balance"
    );
  });

  it("Should NOT withdraw in ETH (NOT UPDATED)", async function () {
    const { Rebase, otherAccount } = await loadFixture(deployFixture);
    const instace = Rebase.connect(otherAccount);
    await instace.deposit({ value: parseEther("1000") });
    await Rebase.setUpdateTolerance(1n);
    await expect(instace.withdrawInEth(parseEther("999"))).to.be.revertedWith(
      "Outdated"
    );
  });

  it("Should NOT withdraw in ETH (PAUSED)", async function () {
    const { Rebase, otherAccount } = await loadFixture(deployFixture);
    const instace = Rebase.connect(otherAccount);
    await instace.deposit({ value: parseEther("1000") });
    await Rebase.pause();
    await expect(
      instace.withdrawInEth(parseEther("999"))
    ).to.be.revertedWithCustomError(Rebase, "EnforcedPause");
  });

  it("Should withdraw in USD", async function () {
    const { Rebase, otherAccount } = await loadFixture(deployFixture);
    const instace = Rebase.connect(otherAccount);
    await instace.deposit({ value: parseEther("1000") });
    expect(await instace.withdrawInUsd(100n)).to.emit(Rebase, "Transfer");
  });

  it("Should NOT withdraw in USD (NOT ENOUGH BALANCE)", async function () {
    const { Rebase, otherAccount } = await loadFixture(deployFixture);
    const instace = Rebase.connect(otherAccount);
    await instace.deposit({ value: parseEther("1000") });
    await expect(instace.withdrawInUsd(1000000001n)).to.be.revertedWith(
      "Not enough balance"
    );
  });
  it("Should NOT withdraw in USD (NOT UPDATED)", async function () {
    const { Rebase, otherAccount } = await loadFixture(deployFixture);
    const instace = Rebase.connect(otherAccount);
    await instace.deposit({ value: parseEther("1000") });
    await Rebase.setUpdateTolerance(1n);
    await expect(instace.withdrawInUsd(100n)).to.be.revertedWith("Outdated");
  });

  it("Should deflate the USDToken", async function () {
    const { Rebase, WeiUsdOracle, UsdEth } = await loadFixture(deployFixture);

    const oldTotalSupply = await UsdEth.totalSupply();

    await WeiUsdOracle.setEthPrice((INITAL_ETHER_PRICE * 95n) / 100n);

    const newTotalSupply = await UsdEth.totalSupply();

    expect(await Rebase.getParity(0n)).to.be.equal(100n);
    expect(newTotalSupply).to.be.equal(Number(oldTotalSupply) * 0.95);
  });

  it("Should inflate the USDToken", async function () {
    const { Rebase, WeiUsdOracle, UsdEth } = await loadFixture(deployFixture);
    const oldTotalSupply = await UsdEth.totalSupply();
    await WeiUsdOracle.setEthPrice((INITAL_ETHER_PRICE * 105n) / 100n);
    const newTotalSupply = await UsdEth.totalSupply();
    expect(await Rebase.getParity(0n)).to.be.equal(100n);
    expect(newTotalSupply).to.be.equal(Number(oldTotalSupply) * 1.05);
  });

  it("Should get the same price", async function () {
    const { Rebase, WeiUsdOracle } = await loadFixture(deployFixture);
    await WeiUsdOracle.setEthPrice(INITAL_ETHER_PRICE);
    expect(await Rebase.getParity(0n)).to.be.equal(100n);
  });
});
