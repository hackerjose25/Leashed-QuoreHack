// node kem-register.mjs <owner|agent|drill>
// Publishes the account's ML-KEM-1024 (FIPS 203) encapsulation key in the x/pqc KEM registry, so others can send it
// QoreSeal-encrypted messages (e.g. confidential invoices). Hybrid-signed (needs the account's ML-DSA-87 key registered).
// The KEM keypair is derived deterministically from the account mnemonic, so it can always be re-created to decrypt.
import { createHash } from "node:crypto";
import { mlkem1024 } from "@qorechain/pqc";
import { msg, KEM_ALGORITHM_ML_KEM_1024, validateKemPublicKey, fetchKemKey } from "@qorechain/sdk";
import { roleArg, loadAccount, send, NET } from "./lib.mjs";

const role = roleArg();
const acc = await loadAccount(role);
const mnemonic = process.env[`${role.toUpperCase()}_MNEMONIC`].trim();
const seed = new Uint8Array(createHash("sha512").update(`leashed:kem:v1|${acc.cosmos}|${mnemonic}`).digest()); // 64 bytes (d||z)
const { publicKey } = mlkem1024.keygen(seed);
validateKemPublicKey(publicKey, KEM_ALGORITHM_ML_KEM_1024);

console.log(`${role}: ${acc.cosmos} — ML-KEM-1024 public key ${publicKey.length} bytes`);
const existing = await fetchKemKey({ rest: NET.rest, address: acc.cosmos }).catch(() => ({ found: false }));
if (existing.found) { console.log("Already registered:", JSON.stringify(existing.key).slice(0, 200)); process.exit(0); }

const m = msg.pqc.registerKemKey({ sender: acc.cosmos, algorithmId: KEM_ALGORITHM_ML_KEM_1024, publicKey });
const res = await send(acc, [m], 600_000, "hybrid");
console.log(`Registered ML-KEM-1024 key. tx: ${res.transactionHash}`);
console.log(`Check: ${NET.rest}/qorechain/pqc/v1/kem/${acc.cosmos}`);
