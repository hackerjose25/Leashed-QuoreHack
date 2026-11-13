// Shared helpers for Leashed ops scripts. Secrets live only in ops/.env (gitignored).
import "dotenv/config";
import { StargateClient } from "@cosmjs/stargate";
import { deriveUnifiedAccount, EthNativeSigner } from "@qorechain/sdk";

export const NET = {
  chainId: "qorechain-diana",
  rest: process.env.QORE_REST || "https://api-testnet.qore.host",
  rpc: process.env.QORE_RPC || "https://rpc-testnet.qore.host",
  denom: "uqor",
  gasPrice: 0.15, // uqor per gas (SDK floor 0.1)
};

export const ROLES = ["owner", "agent", "drill"];

export function roleArg() {
  const role = (process.argv[2] || "").toLowerCase();
  if (!ROLES.includes(role)) {
    console.error(`Usage: node <script> <${ROLES.join("|")}> [options]`);
    process.exit(1);
  }
  return role;
}

export async function loadAccount(role) {
  const mnemonic = process.env[`${role.toUpperCase()}_MNEMONIC`];
  if (!mnemonic) throw new Error(`${role.toUpperCase()}_MNEMONIC missing in ops/.env — run: node new-account.mjs ${role}`);
  return deriveUnifiedAccount(mnemonic.trim());
}

export async function getJson(path) {
  const res = await fetch(`${NET.rest}${path}`);
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

/** account_number + sequence from REST. Throws if the account is not on chain yet (never funded). */
export async function authInfo(qor) {
  const { ok, body } = await getJson(`/cosmos/auth/v1beta1/accounts/${qor}`);
  if (!ok || !body.account) throw new Error(`Account ${qor} not on chain yet. Fund it first (send ~5 QOR from QoreX).`);
  const a = body.account.base_account || body.account;
  return { accountNumber: BigInt(a.account_number), sequence: BigInt(a.sequence || 0) };
}

export async function pqcStatus(qor) {
  const { body } = await getJson(`/qorechain/pqc/v1/account/${qor}`);
  return body;
}

export async function windowStatus(qor) {
  const { body } = await getJson(`/qorechain/pqc/v1/evm_window/${qor}`);
  return body;
}

export function fee(gas) {
  return { amount: [{ denom: NET.denom, amount: String(Math.ceil(gas * NET.gasPrice)) }], gas: String(gas) };
}

/** Sign (classical or hybrid) and broadcast messages from a unified account. */
export async function send(account, messages, gas, signMode = "hybrid", registry) {
  const { accountNumber, sequence } = await authInfo(account.cosmos);
  const signer = new EthNativeSigner(account, { signMode, rest: NET.rest, ...(registry && { registry }) });
  const client = await StargateClient.connect(NET.rpc);
  try {
    const res = await signer.signAndBroadcast(client, {
      chainId: NET.chainId,
      accountNumber,
      sequence,
      messages,
      fee: fee(gas),
    });
    if (res.code !== 0) throw new Error(`Tx failed code=${res.code} hash=${res.transactionHash}\n${res.rawLog || ""}`);
    return res;
  } finally {
    client.disconnect();
  }
}
