import { defineChain } from "viem";

// QoreChain testnet (docs.qorechain.io/sdk/reference/network)
export const qoreTestnet = defineChain({
  id: 9800,
  name: "QoreChain Testnet (diana)",
  nativeCurrency: { name: "QOR", symbol: "QOR", decimals: 18 },
  rpcUrls: { default: { http: ["https://evm-testnet.qore.host"], webSocket: ["wss://evm-ws-testnet.qore.host"] } },
  blockExplorers: { default: { name: "QoreChain Explorer", url: "https://explore.qore.network" } },
  testnet: true,
});

export const QORE = {
  cosmosChainId: "qorechain-diana",
  rest: "https://api-testnet.qore.host",
  rpc: "https://rpc-testnet.qore.host",
  bech32Prefix: "qor",
  denom: "uqor",
};

/** Agent's EVM window status (x/pqc). `found: false` means no window → every agent EVM tx is refused. */
export async function fetchEvmWindow(address: string) {
  const res = await fetch(`${QORE.rest}/qorechain/pqc/v1/evm_window/${address}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`evm_window query failed: ${res.status}`);
  return res.json();
}
