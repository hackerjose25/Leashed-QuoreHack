// node drill-day.mjs   — run ONCE on 18 Nov (UTC) — that's 18 Nov 05:30 IST to 19 Nov 05:29 IST.
// 1) Opens the drill account's EVM window scoped to the vault ONLY (so the attacker bot's drain calls
//    reach LeashedVault and are refused: NotOwner / NotOperator — shows as "blocked" in the attack log).
// 2) Sends the "normal transaction": 0.1 QOR from the drill account to the owner (hybrid ECDSA + ML-DSA-87 signed).
// 3) Prints the tx hash to paste on the project page, and saves everything to ops/drill-result.json.
import fs from "node:fs";
import { openEvmWindowMsg } from "@qorechain/sdk";
import { loadAccount, windowStatus, send, NET } from "./lib.mjs";
import deployments from "./deployments.json" with { type: "json" };

const now = new Date();
const utcDay = now.toISOString().slice(0, 10);
if (utcDay !== "2026-11-18" && !process.argv.includes("--force")) {
  console.error(`It is ${now.toISOString()} (UTC day ${utcDay}). The drill transaction only counts on 2026-11-18 UTC.\nRun this between 18 Nov 05:30 and 19 Nov 05:29 India time. (Use --force to run anyway.)`);
  process.exit(1);
}

const drill = await loadAccount("drill");
console.log(`Drill account ${drill.cosmos} / ${drill.evm}`);
const DRILL_VAULT = deployments.v1?.vault ?? deployments.vault; // registered drill target = vault v1
const result = { startedAt: now.toISOString(), drill: { cosmos: drill.cosmos, evm: drill.evm }, vault: DRILL_VAULT };

// 1) Scoped window (skip if one is already live)
const w = await windowStatus(drill.cosmos);
if (w?.live) {
  console.log(`Window already live: ${w.remaining_txs} txs, ${w.remaining_blocks} blocks left, targets=${(w.allowed_targets || []).join(",") || "ANY"}`);
} else {
  const msg = openEvmWindowMsg({ sender: drill.cosmos, blocks: 17280, maxTxs: 25, maxValue: String(1_000_000), allowedTargets: [DRILL_VAULT] });
  const res = await send(drill, [msg], 500_000, "hybrid");
  console.log(`Opened vault-only window (25 txs, 1 QOR budget). tx: ${res.transactionHash}`);
  result.windowTx = res.transactionHash;
}
result.window = await windowStatus(drill.cosmos);

// 2) Normal transaction
const tx = await send(drill, [{
  typeUrl: "/cosmos.bank.v1beta1.MsgSend",
  value: { fromAddress: drill.cosmos, toAddress: deployments.owner.cosmos, amount: [{ denom: NET.denom, amount: "100000" }] },
}], 300_000, "hybrid");
result.normalTx = tx.transactionHash;
result.finishedAt = new Date().toISOString();
fs.writeFileSync(new URL("./drill-result.json", import.meta.url), JSON.stringify(result, null, 2));

console.log(`\n✅ Normal transaction sent: ${tx.transactionHash}`);
console.log(`👉 Paste this hash on your project page (Q-Day Drill proof).`);
console.log(`Saved to ops/drill-result.json`);
