// node convert.mjs <owner|agent|drill> <amount> [--token fUSD] [--to 0x…]
// Converts a fest bank coin (denom "erc20:<addr>") into its ERC-20 form so EVM contracts can use it.
// Msg: /cosmos.evm.erc20.v1.MsgConvertCoin { coin, receiver (0x), sender (qor1) } — hybrid PQC signed, ~432k gas.
// Source: docs.qorechain.io/developer-guide/evm-development#fest-convert
import { BinaryWriter, BinaryReader } from "cosmjs-types/binary";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import { qorechainRegistry } from "@qorechain/sdk";
import { parseUnits } from "viem";
import { roleArg, loadAccount, send } from "./lib.mjs";
import { TOKENS } from "./evm.mjs";

const TYPE_URL = "/cosmos.evm.erc20.v1.MsgConvertCoin";
// proto: message MsgConvertCoin { Coin coin = 1; string receiver = 2; string sender = 3; }
const MsgConvertCoin = {
  encode(m, w = BinaryWriter.create()) {
    if (m.coin) Coin.encode(m.coin, w.uint32(10).fork()).ldelim();
    if (m.receiver) w.uint32(18).string(m.receiver);
    if (m.sender) w.uint32(26).string(m.sender);
    return w;
  },
  decode(input) {
    const r = input instanceof BinaryReader ? input : new BinaryReader(input);
    const m = { coin: undefined, receiver: "", sender: "" };
    while (r.pos < r.len) {
      const tag = r.uint32();
      if (tag >>> 3 === 1) m.coin = Coin.decode(r, r.uint32());
      else if (tag >>> 3 === 2) m.receiver = r.string();
      else if (tag >>> 3 === 3) m.sender = r.string();
      else r.skipType(tag & 7);
    }
    return m;
  },
  fromPartial: (o) => ({ coin: o.coin, receiver: o.receiver ?? "", sender: o.sender ?? "" }),
};

const role = roleArg();
const amount = process.argv[3];
if (!amount) { console.error("Usage: node convert.mjs <role> <amount> [--token fUSD] [--to 0x…]"); process.exit(1); }
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const DECIMALS = { fUSD: 6, fETH: 18, fBTC: 8 };
const ADDR = { fUSD: TOKENS.fUSD, fETH: TOKENS.t0229, fBTC: TOKENS.t4604 };
const sym = arg("token", "fUSD");
if (!ADDR[sym]) throw new Error(`Unknown token ${sym}`);

const acc = await loadAccount(role);
const receiver = arg("to", acc.evm);
const coin = { denom: `erc20:${ADDR[sym]}`, amount: parseUnits(amount, DECIMALS[sym]).toString() };
console.log(`${role} ${acc.cosmos}: converting ${amount} ${sym} (${coin.amount} base) → ERC-20 at ${receiver}`);

const registry = qorechainRegistry([[TYPE_URL, MsgConvertCoin]]);
const res = await send(acc, [{ typeUrl: TYPE_URL, value: { coin, receiver, sender: acc.cosmos } }], 600_000, "hybrid", registry);
console.log(`Converted. tx: ${res.transactionHash}\nCheck: node balances.mjs ${acc.cosmos}`);
