# Leashed — Dated plan (2 people)

A = contracts + chain · B = app + agent. Dates UTC 2026.

| Date | A | B | Gate |
|---|---|---|---|
| 13–14 Nov | Hardhat setup, testnet accounts, faucet, register ML-DSA keys, open window, deploy test contract | Next.js app on Vercel, layout, QoreX connect. Attend Workshop 2 (14 Nov 12:00) | First tx on explorer |
| 15–16 Nov | `LeashedVault.sol` v1 + tests (happy path + every revert). Deploy | Dashboard reads vault (balance, vendors, policy) | Vault on testnet |
| **17 Nov** | **Drill registration (before 23:59):** fresh drill account, ML-DSA registered, ECDSA key, vault address(es) | Agent route: Claude + read tools | **Drill registered** |
| 18 Nov | Drill day: one normal tx from drill account, save hash. Watch attack log | Agent `proposePayment` with `eth_call` pre-check | Hash submitted |
| 19–22 Nov | Request/approve flow, pause, daily cap. Window open/close from browser | Approvals page, blocked-attempt log, "Renew leash" UI | End-to-end payment via chat |
| 23–26 Nov | Attack scripts: prompt injection, leaked key, wrong target. Capture real evidence | Security + Audit pages, invoice upload | All demo scenes work |
| 27–29 Nov | Stretch: QoreSeal invoices / PQC precompile approval. Workshop 4 clinic | Landing page, polish, Vercel Cron DCA | Feature freeze 29 Nov |
| 30 Nov–2 Dec | README, threat model, LICENSE, AI_USAGE.md | Cover image, 3-min video | **Submit by 2 Dec 23:59** |

Submission checklist: public repo · MIT license · README · cover 1200×675 · video ≤3 min · qor1 testnet address · Build GitHub App installed · both members registered (GitHub, X, QoreX) · kits ticked.
