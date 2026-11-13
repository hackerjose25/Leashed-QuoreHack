// node deploy-vault.mjs [--token 0x...] [--check]
// Deploys LeashedVault from the OWNER account (needs an open, unscoped EVM window).
// Operator = AGENT account. Saves result to ops/deployments.json.
// --check : only read the token (name/symbol/decimals) and the owner's window, deploy nothing.
import fs from "node:fs";
import { createPublicClient, createWalletClient, http, defineChain, erc20Abi, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { loadAccount, windowStatus } from "./lib.mjs";

const qore = defineChain({
  id: 9800,
  name: "QoreChain Testnet",
  nativeCurrency: { name: "QOR", symbol: "QOR", decimals: 18 },
  rpcUrls: { default: { http: [process.env.QORE_EVM_RPC || "https://evm-testnet.qore.host"] } },
});

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const TOKEN = arg("token", "0x97143B771D34ddb9130b807b135Ae675A5a963CA"); // believed to be fUSD — verified below
const checkOnly = process.argv.includes("--check");

const owner = await loadAccount("owner");
const agent = await loadAccount("agent");
const pub = createPublicClient({ chain: qore, transport: http() });

const [name, symbol, decimals] = await Promise.all([
  pub.readContract({ address: TOKEN, abi: erc20Abi, functionName: "name" }),
  pub.readContract({ address: TOKEN, abi: erc20Abi, functionName: "symbol" }),
  pub.readContract({ address: TOKEN, abi: erc20Abi, functionName: "decimals" }),
]);
console.log(`Token ${TOKEN}: ${name} (${symbol}), ${decimals} decimals`);

const w = await windowStatus(owner.cosmos);
console.log(`Owner window: ${w.live ? `live, ${w.remaining_txs} txs left, targets=${w.allowed_targets.join(",") || "ANY"}` : "NONE"}`);
if (checkOnly) process.exit(0);
if (!w.live) throw new Error("Owner has no live window. Run: node window.mjs owner open --txs 20 --qor 3");
if (w.allowed_targets.length) throw new Error("Owner window is scoped — contract creation is refused. Open an unscoped one.");

const artifact = JSON.parse(fs.readFileSync(new URL("../contracts/artifacts/contracts/LeashedVault.sol/LeashedVault.json", import.meta.url)));
const u = (n) => parseUnits(String(n), decimals);
const args = [TOKEN, agent.evm, u(1000), u(2000), u(500)]; // perTxCap, dailyCap, approvalThreshold

const wallet = createWalletClient({ account: privateKeyToAccount(owner.privateKey), chain: qore, transport: http() });
console.log(`Deploying LeashedVault (owner ${owner.evm}, operator ${agent.evm}) ...`);
const hash = await wallet.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, args });
console.log(`tx: ${hash}`);
const rcpt = await pub.waitForTransactionReceipt({ hash });
if (rcpt.status !== "success") throw new Error(`Deploy reverted: ${hash}`);

const out = {
  network: "qorechain-diana (9800)",
  vault: rcpt.contractAddress,
  token: { address: TOKEN, name, symbol, decimals },
  owner: { evm: owner.evm, cosmos: owner.cosmos },
  agent: { evm: agent.evm, cosmos: agent.cosmos },
  policy: { perTxCap: 1000, dailyCap: 2000, approvalThreshold: 500 },
  deployTx: hash,
  block: Number(rcpt.blockNumber),
  date: new Date().toISOString(),
};
fs.writeFileSync(new URL("./deployments.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(`LeashedVault deployed at ${rcpt.contractAddress}\nSaved ops/deployments.json`);
