// node status.mjs <owner|agent|drill> — balances, PQC key, EVM window (public info only)
import { roleArg, loadAccount, getJson, pqcStatus, windowStatus } from "./lib.mjs";

const role = roleArg();
const acc = await loadAccount(role);
console.log(`${role}\n  qor1: ${acc.cosmos}\n  0x  : ${acc.evm}`);
const bal = await getJson(`/cosmos/bank/v1beta1/balances/${acc.cosmos}`);
console.log("balances:", JSON.stringify(bal.body.balances ?? bal.body));
const p = await pqcStatus(acc.cosmos);
console.log("pqc key:", p?.found ? `${p.account.algorithm_name}, possession_proven=${p.account.possession_proven}` : "NOT registered");
const w = await windowStatus(acc.cosmos);
console.log("window:", w?.live ? `live, ${w.remaining_txs} txs / ${w.remaining_blocks} blocks left, targets=${(w.allowed_targets || []).join(",") || "ANY"}` : "none");
