// node new-account.mjs <owner|agent|drill>
// Creates a unified (eth_secp256k1) account and saves its mnemonic to ops/.env. Prints public addresses only.
import fs from "node:fs";
import { generateMnemonic, deriveUnifiedAccount } from "@qorechain/sdk";
import { roleArg } from "./lib.mjs";

const role = roleArg();
const key = `${role.toUpperCase()}_MNEMONIC`;
const envPath = new URL("./.env", import.meta.url);
const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

if (new RegExp(`^${key}=`, "m").test(existing)) {
  console.error(`${key} already exists in ops/.env — refusing to overwrite. Delete it manually if you really want a new one.`);
  process.exit(1);
}

const mnemonic = generateMnemonic(256);
const acc = await deriveUnifiedAccount(mnemonic);
fs.appendFileSync(envPath, `${existing && !existing.endsWith("\n") ? "\n" : ""}${key}="${mnemonic}"\n`);

console.log(`Created ${role} account (mnemonic saved to ops/.env — back it up, never commit it)`);
console.log(`  qor1: ${acc.cosmos}`);
console.log(`  0x  : ${acc.evm}`);
console.log(`Next: send ~5 QOR to ${acc.cosmos} from QoreX, then: node register.mjs ${role}`);
