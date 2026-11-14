// node swap.mjs <owner|agent|drill> <QOR amount>  — swap native QOR for fUSD in the native AMM (pool 2: fUSD/uqor).
// Hybrid-signed MsgSwapExactIn with a min-out guard (max 20% below the pool's quoted price).
import { msg } from "@qorechain/sdk";
import { roleArg, loadAccount, send, getJson } from "./lib.mjs";
import { TOKENS } from "./evm.mjs";

const role = roleArg();
const qor = Number(process.argv[3]);
if (!qor) { console.error("Usage: node swap.mjs <role> <QOR amount>"); process.exit(1); }
const acc = await loadAccount(role);

const POOL = "2";
const FUSD = `erc20:${TOKENS.fUSD}`;
const { body } = await getJson(`/qorechain/amm/v1/pools`);
const pool = body.pools.find((p) => p.id === POOL);
if (!pool || pool.token_a !== FUSD || pool.token_b !== "uqor") throw new Error("pool 2 is not fUSD/uqor any more");
const amountIn = BigInt(Math.round(qor * 1e6));
const [ra, rb] = [BigInt(pool.reserve_a), BigInt(pool.reserve_b)];
const quote = (amountIn * ra) / (rb + amountIn); // constant product, before fee
const minOut = (quote * 80n) / 100n;
console.log(`${role} ${acc.cosmos}: swap ${qor} QOR → fUSD in pool ${POOL} (quote ≈ ${Number(quote) / 1e6} fUSD, min ${Number(minOut) / 1e6})`);

const m = msg.amm.swapExactIn({ sender: acc.cosmos, poolId: POOL, tokenIn: { denom: "uqor", amount: amountIn.toString() }, denomOut: FUSD, minOut: minOut.toString() });
const res = await send(acc, [m], 400_000, "hybrid");
console.log(`Swapped. tx: ${res.transactionHash}`);
