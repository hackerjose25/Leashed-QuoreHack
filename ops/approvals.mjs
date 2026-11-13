// node approvals.mjs list            — read-only: all payment requests and their state
// node approvals.mjs approve <id>    — OWNER approves a request (owner needs a live window)
// node approvals.mjs execute <id>    — AGENT executes an approved request (agent window scoped to the vault)
import { formatUnits, BaseError, ContractFunctionRevertedError } from "viem";
import { loadAccount } from "./lib.mjs";
import { pub, walletFor, loadDeployments, vaultAbi } from "./evm.mjs";

const dep = loadDeployments();
const abi = vaultAbi();
const fmt = (x) => formatUnits(x, dep.token.decimals);
const nameOf = (a) => dep.vendors?.find((v) => v.address.toLowerCase() === a.toLowerCase())?.name || a;
const read = (functionName, args = []) => pub.readContract({ address: dep.vault, abi, functionName, args });

const [action = "list", idArg] = process.argv.slice(2);

if (action === "list") {
  const n = await read("requestCount");
  if (!n) console.log("No requests yet.");
  for (let id = 0n; id < n; id++) {
    const [vendor, amount, , expiry, approved, executed] = await read("requests", [id]);
    const state = executed ? "executed" : approved ? "approved" : Date.now() / 1000 > Number(expiry) ? "expired" : "pending";
    console.log(`  #${id}  ${fmt(amount)} fUSD → ${nameOf(vendor)}  ${state}  (expires ${new Date(Number(expiry) * 1000).toISOString()})`);
  }
} else if (action === "approve" || action === "execute") {
  if (idArg === undefined) throw new Error(`Usage: node approvals.mjs ${action} <id>`);
  const role = action === "approve" ? "owner" : "agent";
  const wallet = walletFor(await loadAccount(role));
  const functionName = action === "approve" ? "approve" : "executeApproved";
  try {
    const { request } = await pub.simulateContract({ address: dep.vault, abi, functionName, args: [BigInt(idArg)], account: wallet.account });
    const hash = await wallet.writeContract(request);
    const r = await pub.waitForTransactionReceipt({ hash });
    if (r.status !== "success") throw new Error(`reverted on chain: ${hash}`);
    console.log(`  ${role} ${functionName}(#${idArg}) ok  tx ${hash}  block ${r.blockNumber}`);
    console.log(`  vault: balance ${fmt(await read("balance"))} fUSD · spent today ${fmt(await read("spentToday"))}`);
  } catch (e) {
    const rev = e instanceof BaseError && e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (rev?.data) {
      console.error(`  BLOCKED by vault: ${rev.data.errorName}(${rev.data.args?.join(", ") ?? ""}) — nothing changed`);
      process.exit(2);
    }
    throw e;
  }
} else {
  console.error("Usage: node approvals.mjs list | approve <id> | execute <id>");
  process.exit(1);
}
