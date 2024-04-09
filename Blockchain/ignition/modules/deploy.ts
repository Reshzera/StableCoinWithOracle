import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "ethers";

const WeiUsdOracleModule = buildModule("LockModule", (m) => {
  const UsdEth = m.contract("UsdEth");
  const WeiUsdOracle = m.contract("WeiUsdOracle", [336031]);

  const Rebase = m.contract("Rebase", [UsdEth, WeiUsdOracle]);

  const WeiUsdOracleSubscribe = m.call(WeiUsdOracle, "subscribe", [Rebase]);
  const UsdEthsetRebaseAddress = m.call(UsdEth, "setRebaseAddress", [Rebase]);

  const weiPerPenny = m.staticCall(WeiUsdOracle, "getWeiRatio");

  m.call(Rebase, "initialize", [weiPerPenny], {
    value: parseEther("1"),
    after: [WeiUsdOracleSubscribe, UsdEthsetRebaseAddress],
  });

  m.call(Rebase, "unpause");

  return { WeiUsdOracle, UsdEth, Rebase };
});

export default WeiUsdOracleModule;
