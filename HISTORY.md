# Leashed — Project History

Running log of decisions, progress and facts verified so far. Newest entries at the bottom of each section. Update this after every work session.

## Key dates (UTC, 2026)
- 14 Nov 12:00 — Workshop 2 · 20 Nov 16:30 — Workshop 3 · 27 Nov 16:30 — Workshop 4 (submission clinic)
- **17 Nov 23:59 — Q-Day Drill registration closes**
- 18 Nov — Drill day (send one normal tx from drill account, submit hash by 19 Nov)
- **2 Dec 23:59 — Submission deadline** (repo frozen)
- 16 Dec — Winners

## Team
- 2 members, 3rd-year students (LICET, Chennai, India). Pitch is business-focused; students only matters for Quantum Campus eligibility.
- Tools: Claude Code + Codex.

## Decisions
| Date | Decision | Why |
|---|---|---|
| 13 Nov | Category: **Post-Quantum AI Agents**; project **Leashed** (AI treasury operator for businesses) | Best fit + prize/grant ceiling |
| 13 Nov | Business positioning, not student/club | User preference; stronger grant case |
| 13 Nov | Two-leash design: protocol EVM window (L1) + `LeashedVault.sol` (L2) | Window value cap counts native QOR only, so token limits need the contract |
| 13 Nov | Agent ML-DSA key held by owner, not server | Agent cannot renew its own window |
| 13 Nov | Single vault contract, not 5 (rejected Codex's split) | Scope for 19 days |
| 13 Nov | Hardhat, not Foundry | Foundry not installed / Windows; Hardhat is an official template |
| 13 Nov | Vercel + Next.js API routes; Upstash/Vercel Blob instead of Cloudflare D1/R2 | One cloud |
| 13 Nov | Claude for the agent | Tool calling |
| 13 Nov | QoreSeal invoices and PQC-precompile approvals = stretch | QoreSeal not on npm; precompile interface undocumented |

## Verified facts (from docs.qorechain.io, 13 Nov)
- Testnet `qorechain-diana`, EVM chain 9800, EVM RPC `https://evm-testnet.qore.host`, REST `https://api-testnet.qore.host`, denom `uqor` (1 QOR = 10^6 uqor), prefix `qor`.
- Every EVM tx needs a registered ML-DSA-87 key (`MsgRegisterPQCKeyV2`, ~600k gas) and an open EVM window (`MsgOpenEVMWindow`, PQC-cosigned). Reads/`eth_call` need neither.
- Window bounds: blocks 1–17,280 (~6h testnet), max-txs 1–1,000, max-value (native QOR, incl. gas). Scope: `allowed_targets` (no contract creation), `native_only`. Not delegable. Close = refused next block.
- Rejection codes (codespace `pqc`): 26 no key/window, 27 expired/exhausted/out of scope, 28 invalid bounds. SDK: `classifyEvmWindowRejection`.
- Window status: `GET /qorechain/pqc/v1/evm_window/{address}`.
- PQC Verify precompile `0x…0A01` active on testnet only; Solidity interface not yet confirmed.
- `x/abstractaccount` spending rules: enabled on testnet, disabled on mainnet.
- `create-qorechain-dapp` GitHub repo returned 404; install is `npm create qorechain-dapp@latest`.

## Progress log
### 13 Nov
- Analysed hackathon (rules, prizes, kits, timeline). Brainstormed 6 ideas, chose Leashed.
- Reviewed Codex's blueprint: kept honesty rules, contract-as-boundary, revert-log caveat; cut scope, fixed timeline/stack/category errors.
- Wrote `docs/ARCHITECTURE.md`, `docs/PLAN.md`.
- Scaffolded `contracts/` (Hardhat): `LeashedVault.sol` + `MockUSD.sol`, **14/14 tests pass**, `scripts/deploy.js`.
- Scaffolded `web/` (Next.js 15, Tailwind, viem, Anthropic SDK); builds and type-checks. `src/lib/chain.ts` has testnet config.
- README, MIT LICENSE, .gitignore. `git init` done; pushed to github.com/hackerjose25/QuoreHack (main).
- QoreX wallet installed on mobile; wallet created; **100 QOR claimed from faucet**. QoreX auto-registered ML-DSA (dilithium5) but uses a Cosmos (coin-118) key → likely can't sign EVM txs → kept as funding wallet only.
- Wrote `ops/` scripts (new-account, register, window, status, deploy-vault) on @qorechain/sdk 0.14.0. **First real run worked**: owner + agent unified accounts created, both ML-DSA keys registered, owner window opened.
- Claude's sandbox can't reach the testnet (TLS issue), so the user runs `ops/` scripts and pastes the output.

## Organizer answers (Discord, ~12 Nov)
- **Scoring (100):** works as described 25 · QoreChain tech usage (verified in repo + on chain) 25 · PQ correctness & security 20 · originality 15 · clarity/UX/docs 15. 70+ = solid on every line. Video + README are how jurors verify "works" and tech usage → clear and complete over polished.
- **Two-stage QCAI audit** (stated for the Post-Quantum dApp track; worth doing for us too): run contracts through the dashboard QCAI Contract Auditor, fix, run again; deliver both public report links + README changelog mapping each finding → change (explain kept findings / false positives).
- **Agent with its own account:** fine. List up to 5 testnet addresses on the project page; README says which does what. Agent needs its own ML-DSA-87 key (native lane) and its own EVM window (EVM lane) — we have both.
- **Testnet:** Diana will not be reset before judging ends 15 Dec; upgrades keep state and are announced.
- **Q-Day Drill:** open to all categories; register on the project page before 17 Nov 23:59 UTC. Any successful tx from the drill account during the drill counts (hybrid native transfer OK); a real project action is better.

## Accounts (public addresses only — never put keys here)
| Role | qor1 address | 0x address | ML-DSA registered | Notes |
|---|---|---|---|---|
| Owner/CFO | qor139tww2lgnls9vucxdmq02s6cass60d3ukctyze | _TBD_ | ? | QoreX mobile wallet, 100 QOR |
| Owner (unified, ops) | qor1xej57n223fmthypae2h7g3um4w4adswu3pc5wp | 0x36654F4d4a8A76bb903dcAAfe4479BabAbd6c1DC | **yes** (tx E99A89CC…8379) | Vault owner/CFO. Funded 10 QOR. Window opened 13 Nov (tx 4388746F…EE44): 17,280 blocks from height 9,997,353, 20 txs, 3 QOR, unscoped |
| Agent operator | qor17eysm9ywfj9tcgayhnrfn3r43xwljhh04ccq3g | 0xf6490d948e4C8aBC23a4BCC699C475899dF95EeF | **yes** (dilithium5, possession proven) | Unified (eth_secp256k1), created 13 Nov via ops/new-account.mjs |
| Drill account | qor1hdz92mycj3h7tcncsjx7uaxpaurjhgh9fuel5y | 0xbB44556C98946FE5E278848Dee74C1eF072Ba2E5 | **yes** (dilithium5, possession proven, tx DC46E510…5E86) | Created 13 Nov, funded 5 QOR from QoreX (tx 4B78F808…AC9F). Fresh, throwaway. **Form not yet submitted (closes 17 Nov 23:59).** |

## Deployed contracts (testnet)
| Contract | Address | Tx | Date |
|---|---|---|---|
| fUSD token (Fest USD, 6 dec, verified) | 0x97143B771D34ddb9130b807b135Ae675A5a963CA | — | faucet |
| LeashedVault v1 | 0xd995932bb8e0d6ee2234d4be3989052e8c339bf4 | 0xa45918fcda89a857f27f99ffd64835bc0072add6424cb6f429db9fd56139ec12 | 13 Nov |

Vault v1 policy: perTx 1000 · daily 2000 · approval above 500 fUSD. Owner 0x3665…c1DC, operator (agent) 0xf649…5EeF. Details in `ops/deployments.json`.

Vault v1 vendors (added 13 Nov, cap 500 each): Acme Design 0x2a16…8bb5 (tx 0xe65f…f9a9), CloudHost 0x6851…30D5 (tx 0x2469…9998), DevAgency 0xdbA8…39a2 (tx 0x2943…0333). `fund 3000` first reverted (ERC20InsufficientBalance: owner had no fUSD). QoreX can't send fest tokens, so `ops/qorex-convert.mjs` converted 1000 fUSD from the QoreX wallet's bank balance straight to ERC-20 at the owner 0x (Cosmos tx D31A0DE4…4790; QoreX's ML-DSA key = canonical derivation). Owner then funded the vault: tx 0x1567…8b6b. **Vault balance 1000 fUSD.**

**First agent payment (13 Nov):** agent window opened scoped to the vault only (tx 6DA1E974…BD03, 50 txs, 3 QOR, expiry height 10,018,081). `pay.mjs CloudHost 200` → tx 0xcef9155f9c2be95c82b9de18e4cbf67e56b06f80a4ef76d7fe2ec7061da3e855 (block 10,000,814). Vault now 800 fUSD, spent today 200. `pay.mjs DevAgency 1200` blocked in simulation with NeedsApproval(1200, 500) — nothing spent (approval check runs before the per-tx cap).

**Approval flow (13 Nov):** `pay.mjs request DevAgency 600` → request #0 (tx 0xc46b2dfe…387e). Agent `execute 0` before approval blocked: NotApproved(0). Owner `approvals.mjs approve 0` → tx 0x88827a17…a38b. Agent `execute 0` → tx 0x17cd584e1912b4ee834e802feacc29af46252f1ddc03c0db2376c6836d59f4ff. Vault now **200 fUSD, spent today 800**. Note: approval waives the per-tx cap, but vendor active + daily cap still apply.

## Blockers
- ~~13 Nov~~ (resolved later 13 Nov — Claude can now run ops/ scripts directly): Claude's sandbox and web fetcher can't reach `*-testnet.qore.host` — the TLS check fails because the certificate chain isn't trusted (`SEC_E_UNTRUSTED_ROOT` / "unable to verify the first certificate"). On-chain checks must be run by the user in a browser/terminal, or the user must allow the network access.

## Open questions
- ~~Does QoreX register the ML-DSA key automatically?~~ Yes — canonical (address-bound) derivation; usable from the mnemonic via SDK.
- Can QoreX open an EVM window, and can it do so for another account (the agent)? Ask at Workshop 2 / Discord.
- fUSD ERC-20 address on testnet.
- Does the project form require `create-qorechain-dapp` specifically?
- Cross-VM prize amount (not relevant to our category).
