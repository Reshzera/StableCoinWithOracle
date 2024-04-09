import dotenv from "dotenv";
import { createPublicClient, createWalletClient, http } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import OracleABI from "../Types/OracleABIType";
import RebaseABI from "../Types/RebaseABIType";
dotenv.config();

const OracleContract = {
  address: process.env.ORACLE_CONTRACT_ADDRESS as `0x${string}`,
  abi: OracleABI,
};

const RebaseContract = {
  address: process.env.REBASE_CONTRACT_ADDRESS as `0x${string}`,
  abi: RebaseABI,
};

const OwnerAccount = mnemonicToAccount(
  process.env.OWNER_MNEMONIC as `0x${string}`
);
const InfuraNodeConnection = createPublicClient({
  chain: sepolia,
  transport: http(process.env.INFURA_URL as string),
});

const OwnerWallet = createWalletClient({
  account: OwnerAccount,
  chain: sepolia,
  transport: http(process.env.INFURA_URL as string),
});

export {
  OracleContract,
  RebaseContract,
  InfuraNodeConnection,
  OwnerWallet,
  OwnerAccount,
};
