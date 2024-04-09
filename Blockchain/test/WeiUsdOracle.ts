import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ZeroAddress, parseEther } from "ethers";
import hre from "hardhat";

const INITAL_ETHER_PRICE = 336031n;
const INITAL_PRICE_FORMATE = 10n ** 18n / INITAL_ETHER_PRICE;

describe("Rebase", function () {
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

    await UsdEth.setRebaseAddress(await Rebase.getAddress());

    const weiPerPenny = await WeiUsdOracle.getWeiRatio();

    await Rebase.initialize(weiPerPenny, {
      value: parseEther("1000"),
    });

    await Rebase.unpause();

    return { WeiUsdOracle, owner, Rebase, otherAccount };
  }

  it("Should deploy the  contract", async function () {
    const { WeiUsdOracle } = await loadFixture(deployFixture);
    expect(await WeiUsdOracle.getAddress()).to.not.be.undefined;
  });

  it("Should Subscribe", async function () {
    const { WeiUsdOracle, Rebase } = await loadFixture(deployFixture);
    await expect(WeiUsdOracle.subscribe(Rebase.target))
      .to.emit(WeiUsdOracle, "Subscribed")
      .withArgs(Rebase.target);
  });

  it("Should NOT Subscribe (NOT OWNER)", async function () {
    const { WeiUsdOracle, otherAccount } = await loadFixture(deployFixture);
    const instance = WeiUsdOracle.connect(otherAccount);
    await expect(
      instance.subscribe(otherAccount.getAddress())
    ).to.be.revertedWithCustomError(WeiUsdOracle, "OwnableUnauthorizedAccount");
  });
  it("Should NOT Subscribe (ALREADY SUBSCRIBED)", async function () {
    const { WeiUsdOracle, Rebase } = await loadFixture(deployFixture);
    await WeiUsdOracle.subscribe(Rebase.target);
    await expect(WeiUsdOracle.subscribe(Rebase.target)).to.be.revertedWith(
      "Already subscribed"
    );
  });
  it("Should NOT subscribe (INVALID SUBSCRIBER ADDRESS)", async function () {
    const { WeiUsdOracle } = await loadFixture(deployFixture);
    await expect(WeiUsdOracle.subscribe(ZeroAddress)).to.be.revertedWith(
      "Invalid subscriber address"
    );
  });

  it("Should Unsubscribe", async function () {
    const { WeiUsdOracle, Rebase } = await loadFixture(deployFixture);
    await WeiUsdOracle.subscribe(Rebase.target);
    await expect(WeiUsdOracle.unsubscribe(Rebase.target))
      .to.emit(WeiUsdOracle, "Unsubscribed")
      .withArgs(Rebase.target);
  });

  it("Should NOT Unsubscribe (NOT OWNER)", async function () {
    const { WeiUsdOracle, otherAccount } = await loadFixture(deployFixture);
    const instance = WeiUsdOracle.connect(otherAccount);
    await expect(
      instance.unsubscribe(otherAccount.getAddress())
    ).to.be.revertedWithCustomError(WeiUsdOracle, "OwnableUnauthorizedAccount");
  });

  it("Should NOT Unsubscribe (NOT SUBSCRIBED)", async function () {
    const { WeiUsdOracle, Rebase } = await loadFixture(deployFixture);
    await expect(WeiUsdOracle.unsubscribe(Rebase.target)).to.be.revertedWith(
      "Not subscribed yet"
    );
  });

  it("Should NOT Unsubscribe (INVALID SUBSCRIBER ADDRESS)", async function () {
    const { WeiUsdOracle } = await loadFixture(deployFixture);
    await expect(WeiUsdOracle.unsubscribe(ZeroAddress)).to.be.revertedWith(
      "Invalid subscriber address"
    );
  });

  it("Should return the correct price", async function () {
    const { WeiUsdOracle, otherAccount } = await loadFixture(deployFixture);
    const otherAccountAddress = await otherAccount.getAddress();
    await WeiUsdOracle.subscribe(otherAccountAddress);

    const instance = WeiUsdOracle.connect(otherAccount);
    expect(await instance.getWeiRatio()).to.equal(INITAL_PRICE_FORMATE);
  });

  it("Should NOT return the correct price (NOT SUBSCRIBER)", async function () {
    const { WeiUsdOracle, otherAccount } = await loadFixture(deployFixture);
    const instance = WeiUsdOracle.connect(otherAccount);
    await expect(instance.getWeiRatio()).to.be.revertedWith("Not authorized");
  });

  it("Should change the price", async function () {
    const { WeiUsdOracle, Rebase } = await loadFixture(deployFixture);
    const price = 436031n;
    await WeiUsdOracle.subscribe(await Rebase.getAddress());

    const priceFormate = 10n ** 18n / price;

    await expect(WeiUsdOracle.setEthPrice(price)).to.emit(
      WeiUsdOracle,
      "AllUpdated"
    );
    expect(await WeiUsdOracle.getWeiRatio()).to.equal(priceFormate);
  });
  it("Should NOT change the price (NOT OWNER)", async function () {
    const { WeiUsdOracle, otherAccount } = await loadFixture(deployFixture);
    const instance = WeiUsdOracle.connect(otherAccount);
    await expect(instance.setEthPrice(436031n)).to.be.revertedWithCustomError(
      WeiUsdOracle,
      "OwnableUnauthorizedAccount"
    );
  });
  it("Shoul NOT emit AllUpdated event (NO SUBSCRIBERS)", async function () {
    const { WeiUsdOracle, Rebase } = await loadFixture(deployFixture);

    await WeiUsdOracle.subscribe(await Rebase.getAddress());
    await WeiUsdOracle.unsubscribe(await Rebase.getAddress());

    await expect(WeiUsdOracle.setEthPrice(436031n)).to.not.emit(
      WeiUsdOracle,
      "AllUpdated"
    );
  });
  it("Should NOT change the price (INVALID PRICE)", async function () {
    const { WeiUsdOracle } = await loadFixture(deployFixture);
    await expect(WeiUsdOracle.setEthPrice(0)).to.be.revertedWith(
      "Invalid eth price"
    );
  });
});
