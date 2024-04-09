import Binance from "binance-api-node";
import {
  InfuraNodeConnection,
  OracleContract,
  OwnerWallet,
} from "../services/OracleBlockchain";

const MIN_INTERVAL = Number(process.env.MIN_INTERVAL);
const PRICE_TRIGGER = Number(process.env.PRICE_TRIGGER);

async function setEthPriceOracle(ethPrice: number) {
  return await OwnerWallet.writeContract({
    ...OracleContract,
    functionName: "setEthPrice",
    args: [BigInt(ethPrice)],
  });
}

async function BinanceBot() {
  const binance = Binance();

  const lastUpdateWeiRatioFromBlockchain =
    await InfuraNodeConnection.readContract({
      ...OracleContract,
      functionName: "lastUpdateWeiRatio",
    });
  const weisPerPenny = await InfuraNodeConnection.readContract({
    ...OracleContract,
    functionName: "getWeiRatio",
  });
  let lastEthPrice = Math.round(10 ** 18 / Number(weisPerPenny));
  let lastUpdateWeiRatio = Number(lastUpdateWeiRatioFromBlockchain);

  console.log("Bot is running...");
  console.log("Last ETH price: ", lastEthPrice);
  console.log("Last update: ", lastUpdateWeiRatio);

  binance.ws.ticker("ETHUSDT", async (ticker) => {
    const ethPriceClosed = Number(ticker.curDayClose) * 100;
    const closedMarketTime = ticker.closeTime;

    const minimumTime = Date.now() - MIN_INTERVAL;
    const priceVariation = Math.abs(ethPriceClosed / lastEthPrice - 1) * 100;
    console.log(`Price variation: ${priceVariation.toFixed(2)}%`);
    if (priceVariation > PRICE_TRIGGER && lastUpdateWeiRatio < minimumTime) {
      console.log("Updating Oracle contract...");
      try {
        await setEthPriceOracle(ethPriceClosed);
        lastEthPrice = ethPriceClosed;
        lastUpdateWeiRatio = closedMarketTime;
      } catch (e) {
        console.error(e);
      }
    }
  });
}

export default BinanceBot;
