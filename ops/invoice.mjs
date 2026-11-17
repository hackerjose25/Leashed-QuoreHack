// Confidential vendor invoices with QoreSeal (ML-KEM-1024, FIPS 203).
//   node invoice.mjs seal <vendor> <amount> "<memo>" [out.qseal]   — a vendor seals an invoice to the vault owner
//   node invoice.mjs open <file.qseal>                              — the owner opens it and prints the pay command
// Sealing needs no secrets: the owner's encapsulation key is resolved from the on-chain x/pqc KEM registry
// (registered by kem-register.mjs). Only the owner's mnemonic can open it. The envelope commits to the
// invoice memo hash the vault stores on payment, so a paid invoice can be matched to its tx later.
import fs from "node:fs";
import { createHash } from "node:crypto";
import { mlkem1024 } from "@qorechain/pqc";
import { open, envelopeToText, envelopeFromText } from "@qorechain/qoreseal";
import { sealToAddresses } from "@qorechain/qoreseal/network";
import { keccak256, stringToHex } from "viem";
import { loadAccount, NET } from "./lib.mjs";

const PURPOSE = "leashed/invoice/v1";
const [cmd, ...args] = process.argv.slice(2);
const owner = await loadAccount("owner");

// Same deterministic derivation kem-register.mjs used for the key that is registered on chain.
function ownerKeys() {
  const mnemonic = process.env.OWNER_MNEMONIC?.trim();
  if (!mnemonic) throw new Error("OWNER_MNEMONIC is not set");
  const seed = new Uint8Array(createHash("sha512").update(`leashed:kem:v1|${owner.cosmos}|${mnemonic}`).digest());
  const { publicKey, secretKey } = mlkem1024.keygen(seed);
  // mlkem-only envelopes never touch the X25519 half; QoreSeal's key type still needs the fields.
  return { seed: seed.slice(0, 32), mlkemPublicKey: publicKey, mlkemSecretKey: secretKey,
    x25519PublicKey: new Uint8Array(32), x25519SecretKey: new Uint8Array(32) };
}

if (cmd === "seal") {
  const [vendor, amount, memo, out = `invoice-${Date.now()}.qseal`] = args;
  if (!vendor || !amount || !memo) throw new Error('usage: node invoice.mjs seal <vendor> <amount> "<memo>" [out]');
  const invoice = { v: 1, vendor, amount, token: "fUSD", memo, memoHash: keccak256(stringToHex(memo)), issued: new Date().toISOString() };
  const envelope = await sealToAddresses({ rest: NET.rest, chainId: NET.chainId, purpose: PURPOSE, mode: "mlkem",
    plaintext: new TextEncoder().encode(JSON.stringify(invoice)), recipients: [{ address: owner.cosmos }] });
  fs.writeFileSync(out, envelopeToText(envelope));
  console.log(`Sealed ${vendor} invoice (${amount} fUSD) to ${owner.cosmos} → ${out} (${envelope.length} B)`);
} else if (cmd === "open") {
  const [file] = args;
  if (!file) throw new Error("usage: node invoice.mjs open <file.qseal>");
  const envelope = envelopeFromText(fs.readFileSync(file, "utf8").trim());
  const inv = JSON.parse(new TextDecoder().decode(open({ chainId: NET.chainId, purpose: PURPOSE, envelope, keys: ownerKeys() })));
  if (inv.memoHash !== keccak256(stringToHex(inv.memo))) throw new Error("memo hash mismatch");
  console.log(JSON.stringify(inv, null, 2));
  console.log(`\nPay it: node pay.mjs ${Number(inv.amount) > 500 ? "request " : ""}${inv.vendor} ${inv.amount} "${inv.memo}"`);
} else {
  console.log('usage: node invoice.mjs seal <vendor> <amount> "<memo>" [out] | open <file.qseal>');
}
