// node deploy-attestor.mjs — deploy PqcAttestor from the OWNER (needs a live unscoped window).
// Constructor CALLs pqcKeyStatus (0x…0A02) for owner + agent and probes pqcVerify (0x…0A01).
import fs from "node:fs";
import { parseEventLogs } from "viem";
import { loadAccount } from "./lib.mjs";
import { pub, walletFor, loadDeployments, saveDeployments } from "./evm.mjs";

const art = JSON.parse(fs.readFileSync(new URL("../contracts/artifacts/contracts/PqcAttestor.sol/PqcAttestor.json", import.meta.url)));
const owner = await loadAccount("owner");
const agent = await loadAccount("agent");
const KEY_STATUS = "0x0000000000000000000000000000000000000a02";
const VERIFY = "0x0000000000000000000000000000000000000a01";
const wallet = walletFor(owner);
const hash = await wallet.deployContract({ abi: art.abi, bytecode: art.bytecode, args: [KEY_STATUS, VERIFY, [owner.evm, agent.evm]] });
console.log(`deploy tx: ${hash}`);
const r = await pub.waitForTransactionReceipt({ hash });
if (r.status !== "success") throw new Error("deploy reverted");
for (const e of parseEventLogs({ abi: art.abi, logs: r.logs })) console.log(" ", e.eventName, JSON.stringify(e.args, (k, v) => (typeof v === "bigint" ? v.toString() : v)));
const dep = loadDeployments();
dep.pqcAttestor = { address: r.contractAddress, deployTx: hash, block: Number(r.blockNumber) };
saveDeployments(dep);
console.log(`PqcAttestor at ${r.contractAddress}`);
