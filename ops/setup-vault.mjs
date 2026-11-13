// node setup-vault.mjs vendors          — add demo vendors (3 owner txs)
// node setup-vault.mjs fund <amount>    — owner transfers <amount> fUSD into the vault (1 owner tx)
// node setup-vault.mjs show             — read-only: policy, vendors, balance
// Owner needs a live window (ops/window.mjs owner open ...).
import { erc20Abi, parseUnits, formatUnits, stringToHex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { loadAccount } from "./lib.mjs";
import { pub, walletFor, loadDeployments, saveDeployments, vaultAbi } from "./evm.mjs";

const dep = loadDeployments();
const abi = vaultAbi();
const VAULT = dep.vault;
const dec = dep.token.decimals;
const u = (n) => parseUnits(String(n), dec);
const action = process.argv[2] || "show";

async function write(owner, functionName, args, address = VAULT, useAbi = abi) {
  const wallet = walletFor(owner);
  const hash = await wallet.writeContract({ address, abi: useAbi, functionName, args });
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${functionName} reverted: ${hash}`);
  console.log(`  ${functionName} ok  tx ${hash}`);
  return hash;
}

if (action === "vendors") {
  const owner = await loadAccount("owner");
  // Demo vendors: fresh addresses. Their keys are discarded; vendors only receive.
  const demo = [
    { name: "Acme Design", category: "design", cap: 500 },
    { name: "CloudHost", category: "infra", cap: 500 },
    { name: "DevAgency", category: "dev", cap: 500 },
  ];
  dep.vendors = dep.vendors || [];
  for (const v of demo) {
    if (dep.vendors.find((x) => x.name === v.name)) { console.log(`  ${v.name} already added`); continue; }
    const address = privateKeyToAccount(generatePrivateKey()).address;
    const tx = await write(owner, "setVendor", [address, true, u(v.cap), stringToHex(v.category, { size: 32 }), v.name]);
    dep.vendors.push({ ...v, address, tx });
    saveDeployments(dep);
  }
} else if (action === "fund") {
  const amount = Number(process.argv[3]);
  if (!amount) throw new Error("Usage: node setup-vault.mjs fund <amount>");
  const owner = await loadAccount("owner");
  await write(owner, "transfer", [VAULT, u(amount)], dep.token.address, erc20Abi);
}

// show
const read = (functionName, args = []) => pub.readContract({ address: VAULT, abi, functionName, args });
const [owner, operator, paused, perTx, daily, thr, bal, spent, vc] = await Promise.all(
  ["owner", "operator", "paused", "perTxCap", "dailyCap", "approvalThreshold", "balance", "spentToday", "vendorCount"].map((f) => read(f))
);
const f = (x) => formatUnits(x, dec);
console.log(`\nVault ${VAULT}\n  owner ${owner}\n  operator ${operator}\n  paused ${paused}`);
console.log(`  policy: perTx ${f(perTx)} · daily ${f(daily)} · approval above ${f(thr)} ${dep.token.symbol}`);
console.log(`  balance ${f(bal)} ${dep.token.symbol} · spent today ${f(spent)} · vendors ${vc}`);
for (const v of dep.vendors || []) console.log(`   - ${v.name.padEnd(12)} ${v.address} cap ${v.cap}`);
