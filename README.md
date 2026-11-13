# Leashed

**Let AI run your company's on-chain treasury without giving it the keys to the kingdom.**

An AI treasury operator on QoreChain held by two independent leashes:
1. **Protocol leash** — a post-quantum (ML-DSA-87) authorized EVM window scoped to the vault only. The agent cannot renew it.
2. **Contract leash** — `LeashedVault.sol`: vendor whitelist, per-tx / daily / per-vendor caps, owner approval above threshold, emergency pause.

Built for *Build Before Q-Day* (QoreChain Developer Fest 2026) — Post-Quantum AI Agents.

## Repo
- `contracts/` — Hardhat, `LeashedVault.sol`, tests (`npx hardhat test`)
- `web/` — Next.js app (Vercel): dashboard, AI agent API, approvals
- `docs/` — [ARCHITECTURE](docs/ARCHITECTURE.md), [PLAN](docs/PLAN.md)

## Network
QoreChain testnet `qorechain-diana`, EVM chain id 9800, RPC `https://evm-testnet.qore.host`.

## License
MIT
