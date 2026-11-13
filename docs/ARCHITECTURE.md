# Leashed — Architecture (v1)

> Let AI run your company's on-chain treasury without giving it the keys to the kingdom.

Category: **Post-Quantum AI Agents** · Network: QoreChain testnet `qorechain-diana` (EVM chain id 9800) · Hosting: Vercel

## 1. Core principle: two independent leashes

The agent is bounded by **two layers that do not trust each other**:

| Layer | Enforced by | What it limits | Who can change it |
|---|---|---|---|
| **L1 — Protocol leash** | QoreChain EVM authorization window (`MsgOpenEVMWindow`) | Agent can only call `LeashedVault` (`allowed_targets`), at most N txs, for at most B blocks, within a native-QOR gas/value cap | Only the holder of the agent account's **ML-DSA-87 key** (kept by the owner, never on the server) |
| **L2 — Contract leash** | `LeashedVault.sol` | Vendor whitelist, per-tx cap, daily cap, per-vendor cap, approval threshold, pause | Only the **owner/CFO** account (itself PQ-protected, since every EVM tx needs a PQ-opened window) |

Why both are needed (from the docs): the window's value cap counts **native QOR only** — a listed token contract admits any token amount. So L1 bounds *where and how often* the agent can act; L2 bounds *how much and to whom*.

## 2. Accounts and keys

| Account | Keys | Where keys live |
|---|---|---|
| **Owner/CFO** | eth_secp256k1 + ML-DSA-87 (registered) | Owner's wallet (QoreX) / browser |
| **Agent operator** | eth_secp256k1 (server) + ML-DSA-87 (registered) | ECDSA key: Vercel server env var. **ML-DSA key: owner only** (derived from agent mnemonic in owner's browser) |
| **Vendors** | any address | — |

Consequence: **the agent cannot renew its own leash.** The server can sign EVM txs only while an owner-opened window is live. "Renew leash" is an owner action in the UI (opens a new scoped window for the agent, cosigned with the agent's ML-DSA key in the browser).

## 3. Threat model (what we claim, and only that)

| Attack | Result | Stopped by |
|---|---|---|
| Prompt injection ("send 50k to 0xEvil") | Reverts: recipient not whitelisted / over cap | L2 |
| Server compromised (agent ECDSA key stolen) | Attacker can only call the vault, ≤ max-txs, until window expiry, within vault policy. Owner closes window → dead next block | L1 + L2 |
| Leaked ECDSA key, no window open | Every EVM tx refused (`pqc` code 26) — cannot open a window without ML-DSA key | L1 |
| Agent tries to change policy / add vendor | Reverts: `onlyOwner` | L2 |
| Agent tries to call any other contract (e.g. token `approve`) | Refused by chain: target not in `allowed_targets` (`pqc` code 27) | L1 |
| Owner ECDSA key leaked | Cannot send EVM txs without ML-DSA-opened window | L1 (protocol) |

Non-claims: we do not claim payload confidentiality of amounts/addresses (public chain); we do not claim on-chain ML-DSA verification unless the `0x…0A01` precompile path is implemented and tested.

## 4. Components

```
Browser (Next.js on Vercel)
 ├─ Dashboard / Chat / Vendors / Approvals / Security / Audit
 ├─ QoreX connect (owner)
 └─ PQ signing (owner): @qorechain/sdk / @qorechain/pqc  → open/close agent window, approvals
        │
Vercel API routes (serverless)
 ├─ /api/agent     Claude + tools: getBalance, listVendors, getPolicy, proposePayment, executePayment
 ├─ /api/window    read agent window status (REST /qorechain/pqc/v1/evm_window/{addr})
 ├─ /api/cron/dca  Vercel Cron (daily) → scheduled payments
 └─ /api/events    index vault events + blocked attempts
        │  (agent ECDSA key, server-only env)
QoreChain testnet
 ├─ EVM: LeashedVault.sol (holds fUSD), fUSD ERC-20
 └─ Cosmos: x/pqc (key registration, EVM windows)
Storage: Upstash Redis (chat history, blocked-attempt log, invoice envelopes)
```

### Agent tool permissions
Read tools: `getTreasury`, `getPolicy`, `listVendors`, `getWindowStatus`, `getHistory`.
Write tools: `proposePayment(vendorId, amount, memo)` → **pre-check via `eth_call` (free, no window needed)** → if it would revert, log a *blocked attempt* with reason; else `executePayment`. Above threshold → creates a pending request for owner approval.
Invoice text is passed to the model as **untrusted data** (quoted, never as instructions). The contract is the security boundary; the LLM check is UX only.

### Blocked-attempt evidence
Reverted txs keep no logs, so blocked attempts are recorded off-chain with: the simulated call, the revert reason from `eth_call`, and where a real tx was sent, its hash + `pqc` error code (`classifyEvmWindowRejection`).

## 5. LeashedVault.sol (single contract)

State: `owner`, `operator`, `token` (fUSD), `paused`, `perTxCap`, `dailyCap`, `approvalThreshold`, `vendors[addr] {active, cap, category, nameHash}`, `daySpent[day]`, `requests[id] {vendor, amount, memoHash, approved, executed, expiry}`.

Functions:
- Owner: `setPolicy`, `addVendor`, `removeVendor`, `setOperator`, `pause/unpause`, `approve(requestId)`, `withdraw`.
- Operator: `pay(vendor, amount, memoHash)` (≤ threshold, all caps), `request(vendor, amount, memoHash)` (> threshold), `executeApproved(requestId)`.
- Events: `Paid`, `Requested`, `Approved`, `PolicyChanged`, `VendorChanged`, `Paused`.
Security: ReentrancyGuard, SafeERC20, expiry + executed flags for replay, custom errors with clear reasons.

Stretch: owner approval verified on-chain via PQC Verify precompile (`0x…0A01`, testnet active) — only if interface is confirmed.

## 6. Confidential invoices (stretch, after core)
QoreSeal `seal({chainId, purpose:"invoice", recipients, plaintext})` → envelope stored in Redis; only `memoHash` (sha256 of envelope) goes on-chain. Envelopes are unsigned → sign with QoreSign `signMessage`. Note: `@qorechain/qoreseal` not yet on npm — build from repo `packages/ts`.

## 7. Open items to verify on testnet (day 1)
1. `npm create qorechain-dapp@latest` Hardhat template output.
2. fUSD ERC-20 address on testnet (faucet gives bank denom `erc20:<addr>`).
3. SDK flow to open a window for an account whose ML-DSA key is in the browser (`openEvmWindowMsg` + cosign) — confirm it works client-side.
4. Exact `pqc` error surfaced over EVM JSON-RPC for a no-window tx (for the leaked-key demo).
5. Testnet block time (docs: 17,280 blocks ≈ 6h).
