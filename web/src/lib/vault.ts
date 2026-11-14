// Server-side reads/writes against LeashedVault. Never import from client components (uses AGENT_PRIVATE_KEY).
import "server-only";
import {
  createPublicClient, createWalletClient, http, formatUnits, parseUnits, keccak256, stringToHex, hexToString,
  parseEventLogs, BaseError, ContractFunctionRevertedError, type Abi, type Address, type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import abiJson from "./vaultAbi.json";
import { qoreTestnet, fetchEvmWindow } from "./chain";

export const abi = abiJson as Abi;
export const VAULT = (process.env.NEXT_PUBLIC_VAULT_ADDRESS || "0xeca1e419d4f4f3a11c38dfd377c4198b7b87d997") as Address;
export const DECIMALS = 6;
export const AGENT_ADDRESS = (process.env.NEXT_PUBLIC_AGENT_ADDRESS || "0xf6490d948e4C8aBC23a4BCC699C475899dF95EeF") as Address;
// Block the vault was deployed in; event scans start here.
const FROM_BLOCK = BigInt(process.env.VAULT_FROM_BLOCK || "10068667");

export const pub = createPublicClient({ chain: qoreTestnet, transport: http() });
const NONE_ID = BigInt(2) ** BigInt(256) - BigInt(1); // vault uses uint256.max for "no request"
const fmt = (x: bigint) => formatUnits(x, DECIMALS);
const read = <T>(functionName: string, args: unknown[] = []) =>
  pub.readContract({ address: VAULT, abi, functionName, args }) as Promise<T>;

export type Vendor = { address: Address; name: string; category: string; cap: string; active: boolean };
export type PaymentRequest = { id: number; vendor: Address; vendorName: string; amount: string; expiry: number; approved: boolean; executed: boolean; state: string };

export async function getVendors(): Promise<Vendor[]> {
  const n = await read<bigint>("vendorCount");
  const addrs = await Promise.all(Array.from({ length: Number(n) }, (_, i) => read<Address>("vendorList", [BigInt(i)])));
  return Promise.all(addrs.map(async (address) => {
    const [active, cap, category, name] = await read<[boolean, bigint, Hex, string]>("vendors", [address]);
    return { address, name, category: hexToString(category, { size: 32 }).replace(/\0+$/, ""), cap: fmt(cap), active };
  }));
}

export async function getTreasury() {
  const [balance, spentToday, perTxCap, dailyCap, approvalThreshold, paused, owner, operator] = await Promise.all([
    read<bigint>("balance"), read<bigint>("spentToday"), read<bigint>("perTxCap"), read<bigint>("dailyCap"),
    read<bigint>("approvalThreshold"), read<boolean>("paused"), read<Address>("owner"), read<Address>("operator"),
  ]);
  return {
    vault: VAULT, token: "fUSD", balance: fmt(balance), spentToday: fmt(spentToday),
    remainingToday: fmt(dailyCap > spentToday ? dailyCap - spentToday : BigInt(0)),
    policy: { perTxCap: fmt(perTxCap), dailyCap: fmt(dailyCap), approvalThreshold: fmt(approvalThreshold) },
    paused, owner, operator,
    // v2: read through the vault itself, which asks QoreChain's pqcKeyStatus precompile (0x…0A02)
    operatorPqc: await read<boolean>("isPqcRegistered", [operator]).catch(() => null),
  };
}

export async function getRequests(vendors?: Vendor[]): Promise<PaymentRequest[]> {
  const vs = vendors ?? (await getVendors());
  const n = Number(await read<bigint>("requestCount"));
  const now = Date.now() / 1000;
  return Promise.all(Array.from({ length: n }, async (_, id) => {
    const [vendor, amount, , expiry, approved, executed] = await read<[Address, bigint, Hex, bigint, boolean, boolean]>("requests", [BigInt(id)]);
    const state = executed ? "executed" : approved ? "approved" : now > Number(expiry) ? "expired" : "pending";
    return { id, vendor, vendorName: vs.find((v) => v.address.toLowerCase() === vendor.toLowerCase())?.name || vendor, amount: fmt(amount), expiry: Number(expiry), approved, executed, state };
  }));
}

export async function getHistory(vendors?: Vendor[]) {
  const vs = vendors ?? (await getVendors());
  const logs = await pub.getLogs({ address: VAULT, fromBlock: FROM_BLOCK, toBlock: "latest" });
  const events = parseEventLogs({ abi, logs, strict: false });
  return events.map((e) => {
    const args = (e.args ?? {}) as Record<string, unknown>;
    const vendor = args.vendor as string | undefined;
    return {
      event: e.eventName as string,
      tx: e.transactionHash,
      block: Number(e.blockNumber),
      vendor: vendor && (vs.find((v) => v.address.toLowerCase() === vendor.toLowerCase())?.name || vendor),
      amount: typeof args.amount === "bigint" ? fmt(args.amount) : undefined,
      requestId: typeof args.id === "bigint" ? Number(args.id) : typeof args.requestId === "bigint" && args.requestId !== NONE_ID ? Number(args.requestId) : undefined,
    };
  }).reverse();
}

export async function getWindow() {
  try {
    return await fetchEvmWindow(process.env.NEXT_PUBLIC_AGENT_COSMOS || "qor17eysm9ywfj9tcgayhnrfn3r43xwljhh04ccq3g");
  } catch (e) {
    return { found: false, error: String(e) };
  }
}

// ---------------- Agent writes (server only) ----------------

export type BlockedAttempt = { at: string; action: string; vendor: string; amount: string; memo: string; reason: string };
const blocked: BlockedAttempt[] = []; // in-memory log of policy blocks (reverted txs leave no on-chain trace)
export const getBlocked = () => [...blocked].reverse();

function agentWallet() {
  const pk = process.env.AGENT_PRIVATE_KEY as Hex | undefined;
  if (!pk) throw new Error("AGENT_PRIVATE_KEY is not set on the server");
  return createWalletClient({ account: privateKeyToAccount(pk), chain: qoreTestnet, transport: http() });
}

function revertReason(e: unknown): string | null {
  const rev = e instanceof BaseError && e.walk((x) => x instanceof ContractFunctionRevertedError);
  if (rev instanceof ContractFunctionRevertedError && rev.data) {
    const args = (rev.data.args ?? []).map((x) => (typeof x === "bigint" && x > BigInt(100000) ? fmt(x) : String(x)));
    return `${rev.data.errorName}(${args.join(", ")})`;
  }
  return null;
}

async function send(functionName: string, args: unknown[]) {
  const wallet = agentWallet();
  const { request } = await pub.simulateContract({ address: VAULT, abi, functionName, args, account: wallet.account });
  const hash = await wallet.writeContract(request);
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`reverted on chain: ${hash}`);
  return receipt;
}

/** Pay a vendor (≤ threshold) or, above it, file a request for owner approval. Always simulated first. */
export async function proposePayment(vendorAddressOrName: string, amount: string, memo: string) {
  const vendors = await getVendors();
  const v = vendors.find((x) => x.address.toLowerCase() === vendorAddressOrName.toLowerCase() || x.name.toLowerCase() === vendorAddressOrName.toLowerCase());
  const vendor = (v?.address ?? vendorAddressOrName) as Address;
  const t = await getTreasury();
  const action = Number(amount) > Number(t.policy.approvalThreshold) ? "request" : "pay";
  try {
    const receipt = await send(action, [vendor, parseUnits(amount, DECIMALS), keccak256(stringToHex(memo))]);
    if (action === "request") {
      const ev = parseEventLogs({ abi, logs: receipt.logs, eventName: "Requested" })[0] as unknown as { args: { id: bigint } };
      return { ok: true, action, status: "pending_owner_approval", requestId: Number(ev.args.id), tx: receipt.transactionHash };
    }
    return { ok: true, action, status: "paid", tx: receipt.transactionHash };
  } catch (e) {
    const reason = revertReason(e);
    if (!reason) throw e;
    blocked.push({ at: new Date().toISOString(), action, vendor: v?.name ?? vendorAddressOrName, amount, memo, reason });
    return { ok: false, action, status: "blocked_by_vault", reason, note: "Simulation reverted; nothing was sent or spent." };
  }
}

export async function executeApproved(id: number) {
  try {
    const receipt = await send("executeApproved", [BigInt(id)]);
    return { ok: true, status: "paid", requestId: id, tx: receipt.transactionHash };
  } catch (e) {
    const reason = revertReason(e);
    if (!reason) throw e;
    blocked.push({ at: new Date().toISOString(), action: "executeApproved", vendor: `request #${id}`, amount: "", memo: "", reason });
    return { ok: false, status: "blocked_by_vault", reason };
  }
}
