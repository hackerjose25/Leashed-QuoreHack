// node migrate-v1-v2.mjs — one-off: copy vendors from vault v1 into v2 (same addresses) and move v1's fUSD into v2.
// Owner needs a live UNSCOPED window. v1 stays deployed (it is the Q-Day drill target) but ends up empty.
import fs from "node:fs";
import { erc20Abi, stringToHex } from "viem";
import { loadAccount } from "./lib.mjs";
import { pub, walletFor, loadDeployments, saveDeployments, vaultAbi } from "./evm.mjs";

const v1 = JSON.parse(fs.readFileSync(new URL("./deployments.v1.json", import.meta.url)));
const dep = loadDeployments();
const abi = vaultAbi(); // v2 ABI is a superset of v1 for everything used here
const owner = await loadAccount("owner");
const wallet = walletFor(owner);

async function write(address, functionName, args, useAbi = abi) {
  const { request } = await pub.simulateContract({ address, abi: useAbi, functionName, args, account: wallet.account });
  const hash = await wallet.writeContract(request);
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${functionName} reverted: ${hash}`);
  console.log(`  ${functionName} ok  tx ${hash}`);
  return hash;
}

console.log(`v1 ${v1.vault} → v2 ${dep.vault}`);
dep.v1 = { vault: v1.vault, deployTx: v1.deployTx, note: "Q-Day drill target; emptied into v2" };
dep.vendors = dep.vendors || [];
for (const v of v1.vendors || []) {
  if (dep.vendors.find((x) => x.address === v.address)) { console.log(`  ${v.name} already in v2`); continue; }
  const cap = BigInt(v.cap) * 10n ** BigInt(dep.token.decimals);
  const tx = await write(dep.vault, "setVendor", [v.address, true, cap, stringToHex(v.category, { size: 32 }), v.name]);
  dep.vendors.push({ ...v, tx });
  saveDeployments(dep);
}

const bal = await pub.readContract({ address: v1.vault, abi: erc20Abi.concat(abi), functionName: "balance" });
if (bal > 0n) {
  await write(v1.vault, "withdraw", [owner.evm, bal]);
  await write(dep.token.address, "transfer", [dep.vault, bal], erc20Abi);
  console.log(`  moved ${Number(bal) / 10 ** dep.token.decimals} fUSD v1 → v2`);
}
saveDeployments(dep);
console.log("done");
