// Open:  node window.mjs <role> open [--blocks 17280] [--txs 50] [--qor 5] [--targets 0xA,0xB]
// Close: node window.mjs <role> close
// Status: node window.mjs <role>
// Opening is a hybrid (ECDSA + ML-DSA-87) signed Cosmos tx — the classical key alone cannot do this.
// No --targets => unscoped (needed for contract deployment). Agent should ALWAYS use --targets <vault>.
import { openEvmWindowMsg, closeEvmWindowMsg } from "@qorechain/sdk";
import { roleArg, loadAccount, windowStatus, send } from "./lib.mjs";

const role = roleArg();
const action = process.argv[3] || "status";
const opt = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
};

const acc = await loadAccount(role);
console.log(`${role}: ${acc.cosmos} / ${acc.evm}`);

if (action === "open") {
  const blocks = Number(opt("blocks", 17280));
  const maxTxs = Number(opt("txs", 50));
  const maxValue = String(Math.round(Number(opt("qor", 5)) * 1e6)); // uqor, covers value + max fees
  const targets = opt("targets", "");
  const allowedTargets = targets ? targets.split(",").map((s) => s.trim()) : undefined;
  const msg = openEvmWindowMsg({ sender: acc.cosmos, blocks, maxTxs, maxValue, ...(allowedTargets && { allowedTargets }) });
  const res = await send(acc, [msg], 500_000, "hybrid");
  console.log(`Window opened: ${blocks} blocks, ${maxTxs} txs, ${maxValue} uqor, targets=${allowedTargets?.join(",") || "ANY"}`);
  console.log(`tx: ${res.transactionHash}`);
} else if (action === "close") {
  const res = await send(acc, [closeEvmWindowMsg(acc.cosmos)], 300_000, "hybrid");
  console.log(`Window closed. tx: ${res.transactionHash}`);
}

console.log(await windowStatus(acc.cosmos));
