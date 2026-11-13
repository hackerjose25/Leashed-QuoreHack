// node register.mjs <owner|agent|drill>
// Registers the account's ML-DSA-87 key (MsgRegisterPQCKeyV2, classical-signed bootstrap tx, with proof of possession).
import { buildRegisterPqcKeyMsg, signProofOfPossession } from "@qorechain/sdk";
import { hexToBytes } from "@noble/hashes/utils";
import { roleArg, loadAccount, pqcStatus, send, NET } from "./lib.mjs";

const role = roleArg();
const acc = await loadAccount(role);
console.log(`${role}: ${acc.cosmos} / ${acc.evm}`);

const status = await pqcStatus(acc.cosmos);
if (status?.found) {
  console.log(`Already registered (${status.account?.algorithm_name}, possession_proven=${status.account?.possession_proven}). Nothing to do.`);
  process.exit(0);
}

const proofOfPossession = signProofOfPossession({ chainId: NET.chainId, account: acc.cosmos, keypair: acc.pqc });
const msg = buildRegisterPqcKeyMsg(acc.cosmos, {
  pqcKeypair: acc.pqc,
  ecdsaPubkey: hexToBytes(acc.publicKey.replace(/^0x/, "")),
  keyType: "hybrid",
  proofOfPossession,
});

const res = await send(acc, [msg], 700_000, "classical");
console.log(`Registered ML-DSA-87 key. tx: ${res.transactionHash}`);
console.log(`Check: ${NET.rest}/qorechain/pqc/v1/account/${acc.cosmos}`);
