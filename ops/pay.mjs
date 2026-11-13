// node pay.mjs <vendor name|0x…> <amount> [memo]       — agent pays a vendor through the vault
// node pay.mjs request <vendor name|0x…> <amount> [memo] — agent asks the owner to approve a payment above the threshold
// Agent needs a live EVM window scoped to the vault: node window.mjs agent open --targets <vault>
// Simulates first, so a policy block prints the vault's reason (e.g. OverPerTxCap) and spends nothing.
import { parseUnits, formatUnits, keccak256, stringToHex, BaseError, ContractFunctionRevertedError } from "viem";
import { loadAccount } from "./lib.mjs";
import { pub, walletFor, loadDeployments, vaultAbi } from "./evm.mjs";

const args = process.argv.slice(2);
const fn = args[0] === "request" ? (args.shift(), "request") : "pay";
const [who, amountStr, ...memoParts] = args;
if (!who || !amountStr) {
  console.error("Usage: node pay.mjs [request] <vendor name|0x…> <amount> [memo]");
  process.exit(1);
}

const dep = loadDeployments();
const abi = vaultAbi();
const vendor = who.startsWith("0x")
  ? who
  : dep.vendors?.find((v) => v.name.toLowerCase() === who.toLowerCase())?.address;
if (!vendor) throw new Error(`Unknown vendor "${who}". Known: ${(dep.vendors || []).map((v) => v.name).join(", ")}`);

const memo = memoParts.join(" ") || `${fn} ${amountStr} fUSD to ${who}`;
const amount = parseUnits(amountStr, dep.token.decimals);
const agent = await loadAccount("agent");
const wallet = walletFor(agent);
const call = { address: dep.vault, abi, functionName: fn, args: [vendor, amount, keccak256(stringToHex(memo))], account: wallet.account };

console.log(`agent ${agent.evm}: ${fn} ${amountStr} fUSD → ${who} (${vendor})\n  memo: "${memo}"`);
try {
  const { request } = await pub.simulateContract(call);
  const hash = await wallet.writeContract(request);
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`reverted on chain: ${hash}`);
  console.log(`  ${fn} ok  tx ${hash}  block ${r.blockNumber}`);
  const spent = await pub.readContract({ address: dep.vault, abi, functionName: "spentToday" });
  const bal = await pub.readContract({ address: dep.vault, abi, functionName: "balance" });
  console.log(`  vault: balance ${formatUnits(bal, dep.token.decimals)} fUSD · spent today ${formatUnits(spent, dep.token.decimals)}`);
} catch (e) {
  const rev = e instanceof BaseError && e.walk((x) => x instanceof ContractFunctionRevertedError);
  if (rev?.data) {
    const a = rev.data.args?.map((x) => (typeof x === "bigint" ? formatUnits(x, dep.token.decimals) : x)).join(", ");
    console.error(`  BLOCKED by vault: ${rev.data.errorName}(${a ?? ""}) — nothing spent`);
    if (rev.data.errorName === "NeedsApproval") console.error(`  → use: node pay.mjs request ${who} ${amountStr}`);
    process.exit(2);
  }
  throw e;
}
