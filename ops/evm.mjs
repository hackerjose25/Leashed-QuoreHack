// Shared viem setup for ops scripts.
import fs from "node:fs";
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { qoreAddresses } from "@qorechain/sdk";

export const qore = defineChain({
  id: 9800,
  name: "QoreChain Testnet",
  nativeCurrency: { name: "QOR", symbol: "QOR", decimals: 18 },
  rpcUrls: { default: { http: [process.env.QORE_EVM_RPC || "https://evm-testnet.qore.host"] } },
});

export const pub = createPublicClient({ chain: qore, transport: http() });
export const walletFor = (account) =>
  createWalletClient({ account: privateKeyToAccount(account.privateKey), chain: qore, transport: http() });

export const TOKENS = {
  fUSD: "0x97143B771D34ddb9130b807b135Ae675A5a963CA",
  t0229: "0x02292293c13880a26242690eb70a0e42B8E91c28",
  t4604: "0x4604e7E45b2ecdbfbDc157103f5B2b62cb16451A",
};

const depPath = new URL("./deployments.json", import.meta.url);
export const loadDeployments = () => JSON.parse(fs.readFileSync(depPath, "utf8"));
export const saveDeployments = (d) => fs.writeFileSync(depPath, JSON.stringify(d, null, 2));

export const vaultAbi = () =>
  JSON.parse(fs.readFileSync(new URL("../contracts/artifacts/contracts/LeashedVault.sol/LeashedVault.json", import.meta.url))).abi;

/** Accept qor1… or 0x… and return both. */
export const both = (addr) => (addr.startsWith("qor1") ? qoreAddresses({ cosmos: addr }) : qoreAddresses({ evm: addr }));
