// node balances.mjs <qor1…|0x…> [more addresses]   — read-only
// Compares bank balances (Cosmos side) with ERC-20 balanceOf (EVM side) for the fest tokens.
import { erc20Abi, formatUnits } from "viem";
import { getJson } from "./lib.mjs";
import { pub, TOKENS, both } from "./evm.mjs";

const addrs = process.argv.slice(2);
if (!addrs.length) { console.error("Usage: node balances.mjs <qor1…|0x…> ..."); process.exit(1); }

const meta = {};
for (const [k, t] of Object.entries(TOKENS)) {
  const [symbol, decimals] = await Promise.all([
    pub.readContract({ address: t, abi: erc20Abi, functionName: "symbol" }),
    pub.readContract({ address: t, abi: erc20Abi, functionName: "decimals" }),
  ]);
  meta[t] = { symbol, decimals };
}

for (const a of addrs) {
  const { cosmos, evm } = both(a);
  console.log(`\n${cosmos} / ${evm}`);
  const bank = (await getJson(`/cosmos/bank/v1beta1/balances/${cosmos}`)).body.balances || [];
  console.log("  bank :", bank.map((b) => `${b.denom}=${b.amount}`).join(", ") || "(none)");
  for (const t of Object.values(TOKENS)) {
    const bal = await pub.readContract({ address: t, abi: erc20Abi, functionName: "balanceOf", args: [evm] });
    console.log(`  erc20: ${meta[t].symbol.padEnd(5)} ${formatUnits(bal, meta[t].decimals)}  (raw ${bal})`);
  }
  console.log(`  QOR (evm): ${formatUnits(await pub.getBalance({ address: evm }), 18)}`);
}
