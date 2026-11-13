// node qorex-send.mjs <qor1… recipient> <amount QOR>
// Sends native QOR from the QoreX wallet (QOREX_MNEMONIC in ops/.env) — used to fund ops accounts without the phone.
import "dotenv/config";
import { StargateClient } from "@cosmjs/stargate";
import {
  qorechainRegistry, deriveNativeAccount, directSignerFromPrivateKey, derivePqcCanonical, signAndBroadcastHybrid,
} from "@qorechain/sdk";
import { NET, authInfo, fee } from "./lib.mjs";

const [to, qor] = process.argv.slice(2);
if (!to?.startsWith("qor1") || !Number(qor)) { console.error("Usage: node qorex-send.mjs <qor1…> <amount QOR>"); process.exit(1); }

const mnemonic = process.env.QOREX_MNEMONIC?.trim();
if (!mnemonic) throw new Error("QOREX_MNEMONIC missing in ops/.env");
const acc = await deriveNativeAccount(mnemonic);
const amount = String(Math.round(Number(qor) * 1e6));
console.log(`QoreX ${acc.address} → ${to}: ${qor} QOR`);

const { accountNumber, sequence } = await authInfo(acc.address);
const client = await StargateClient.connect(NET.rpc);
try {
  const res = await signAndBroadcastHybrid({
    registry: qorechainRegistry(),
    signer: await directSignerFromPrivateKey(acc.privateKey, "qor"),
    pqcKeypair: derivePqcCanonical(acc.address, mnemonic),
    messages: [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: { fromAddress: acc.address, toAddress: to, amount: [{ denom: NET.denom, amount }] } }],
    fee: fee(300_000),
    chainId: NET.chainId, accountNumber, sequence, rest: NET.rest, transport: client,
  });
  console.log(`Sent. tx: ${res.transactionHash}`);
} finally {
  client.disconnect();
}
