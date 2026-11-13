// node qorex-convert.mjs <amount> [--to 0x…]
// QoreX can't send fest tokens, so this converts fUSD held as a bank coin in the QoreX wallet
// (coin-118 key, QOREX_MNEMONIC in ops/.env) straight into ERC-20 at --to (default: the owner's 0x).
// Signs hybrid with whichever ML-DSA derivation matches the key registered on chain.
import "dotenv/config";
import { BinaryWriter } from "cosmjs-types/binary";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import { StargateClient } from "@cosmjs/stargate";
import {
  qorechainRegistry, deriveNativeAccount, directSignerFromPrivateKey,
  derivePqcCanonical, derivePqcLegacy, signAndBroadcastHybrid,
} from "@qorechain/sdk";
import { parseUnits } from "viem";
import { NET, authInfo, pqcStatus, fee } from "./lib.mjs";
import { TOKENS } from "./evm.mjs";
import deployments from "./deployments.json" with { type: "json" };

const TYPE_URL = "/cosmos.evm.erc20.v1.MsgConvertCoin";
const MsgConvertCoin = {
  encode(m, w = BinaryWriter.create()) {
    if (m.coin) Coin.encode(m.coin, w.uint32(10).fork()).ldelim();
    if (m.receiver) w.uint32(18).string(m.receiver);
    if (m.sender) w.uint32(26).string(m.sender);
    return w;
  },
  decode() { throw new Error("decode not needed"); },
  fromPartial: (o) => o,
};

const amount = process.argv[2];
if (!amount) { console.error("Usage: node qorex-convert.mjs <amount> [--to 0x…]"); process.exit(1); }
const i = process.argv.indexOf("--to");
const receiver = i > -1 ? process.argv[i + 1] : deployments.owner.evm;

const mnemonic = process.env.QOREX_MNEMONIC?.trim();
if (!mnemonic) throw new Error('QOREX_MNEMONIC missing in ops/.env — add a line: QOREX_MNEMONIC="word1 word2 …"');

const acc = await deriveNativeAccount(mnemonic);
console.log(`QoreX wallet: ${acc.address}`);

// Pick the PQC key that matches what's registered on chain.
const status = JSON.stringify(await pqcStatus(acc.address));
const hex = (b) => Buffer.from(b).toString("hex");
const b64 = (b) => Buffer.from(b).toString("base64");
const candidates = { canonical: derivePqcCanonical(acc.address, mnemonic), legacy: derivePqcLegacy(mnemonic) };
const [kind, pqcKeypair] = Object.entries(candidates).find(([, k]) =>
  status.includes(hex(k.publicKey)) || status.includes(b64(k.publicKey))) || [];
if (!pqcKeypair) {
  console.error("Neither PQC derivation matches the registered key. Chain says:\n" + status.slice(0, 600));
  process.exit(1);
}
console.log(`Registered ML-DSA key matches the ${kind} derivation.`);

const coin = { denom: `erc20:${TOKENS.fUSD}`, amount: parseUnits(amount, 6).toString() };
console.log(`Converting ${amount} fUSD → ERC-20 at ${receiver}`);

const { accountNumber, sequence } = await authInfo(acc.address);
const client = await StargateClient.connect(NET.rpc);
try {
  const res = await signAndBroadcastHybrid({
    registry: qorechainRegistry([[TYPE_URL, MsgConvertCoin]]),
    signer: await directSignerFromPrivateKey(acc.privateKey, "qor"),
    pqcKeypair,
    messages: [{ typeUrl: TYPE_URL, value: { coin, receiver, sender: acc.address } }],
    fee: fee(600_000),
    chainId: NET.chainId,
    accountNumber,
    sequence,
    rest: NET.rest,
    transport: client,
  });
  console.log(`Done. tx: ${res.transactionHash}\nCheck: node balances.mjs ${receiver}`);
} finally {
  client.disconnect();
}
