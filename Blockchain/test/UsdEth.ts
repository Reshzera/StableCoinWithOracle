import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { parseEther } from "ethers";
import hre from "hardhat";

const INITAL_ETHER_PRICE = 336031n;

describe("UsdEth", function () {
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

    return { UsdEth, Rebase, owner, otherAccount };
  }

  it("Should deploy the  contract", async function () {
    const { UsdEth } = await loadFixture(deployFixture);
    expect(await UsdEth.getAddress()).to.not.be.undefined;
  });

  it("Should set Rebase address", async function () {
    const { UsdEth, Rebase } = await loadFixture(deployFixture);
    await expect(UsdEth.setRebaseAddress(await Rebase.getAddress())).to.not.be
      .reverted;
  });
  it("Should NOT set Rebase address (NOT OWNER)", async function () {
    const { UsdEth, Rebase, otherAccount } = await loadFixture(deployFixture);
    const instance = UsdEth.connect(otherAccount);
    await expect(
      instance.setRebaseAddress(await Rebase.getAddress())
    ).to.be.revertedWithCustomError(UsdEth, "OwnableUnauthorizedAccount");
  });
  it("Should mint USD", async function () {
    const { UsdEth, Rebase, otherAccount } = await loadFixture(deployFixture);
    await UsdEth.setRebaseAddress(await Rebase.getAddress());
    await expect(UsdEth.mint(await otherAccount.getAddress(), 100n)).to.not.be
      .reverted;
  });
  it("Should NOT mint USD (NOT ADMIN)", async function () {
    const { UsdEth, Rebase, otherAccount } = await loadFixture(deployFixture);
    await UsdEth.setRebaseAddress(await Rebase.getAddress());
    const instance = UsdEth.connect(otherAccount);
    await expect(
      instance.mint(await otherAccount.getAddress(), 100n)
    ).to.be.revertedWith("Not authorized");
  });

  it("Should burn USD", async function () {
    const { UsdEth, Rebase, otherAccount } = await loadFixture(deployFixture);
    await UsdEth.setRebaseAddress(await Rebase.getAddress());
    await UsdEth.mint(await otherAccount.getAddress(), 100n);
    await expect(
      UsdEth["burn(address,uint256)"](await otherAccount.getAddress(), 100n)
    ).to.not.be.reverted;
  });
  it("Should NOT burn USD (NOT ADMIN)", async function () {
    const { UsdEth, Rebase, otherAccount } = await loadFixture(deployFixture);
    await UsdEth.setRebaseAddress(await Rebase.getAddress());
    await UsdEth.mint(await otherAccount.getAddress(), 100n);
    const instance = UsdEth.connect(otherAccount);
    await expect(
      instance["burn(address,uint256)"](await otherAccount.getAddress(), 100n)
    ).to.be.revertedWith("Not authorized");
  });
  it("Should return decimals", async function () {
    const { UsdEth } = await loadFixture(deployFixture);
    expect(await UsdEth.decimals()).to.equal(2);
  });

  it("Should accept mint from Rebase", async function () {
    const { UsdEth, otherAccount } = await loadFixture(deployFixture);
    await UsdEth.setRebaseAddress(await otherAccount.getAddress());
    const instance = UsdEth.connect(otherAccount);

    await expect(instance.mint(await UsdEth.getAddress(), 100n)).to.not.be
      .reverted;
  });
});
