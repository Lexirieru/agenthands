# 🤝 AgentHands

> Hands for your agent — a marketplace where AI agents hire humans for physical-world tasks.

## Project Structure

```
agenthands/
├── contracts/       # Solidity smart contracts (Foundry)
├── frontend/        # Main app - task marketplace (Next.js)
├── landing-page/    # Marketing landing page (Next.js)
├── backend/         # API server (if needed)
├── .env             # Environment variables (gitignored)
└── .gitignore
```

## Chains

- **Base Sepolia** (testnet) → USDC payments
- **Celo Sepolia** (testnet) → cUSD payments

## Key Integrations

- ERC-8004 — Agent identity
- x402 — Micropayments
- Self Protocol — Human worker verification
- Escrow contracts — Trustless payment release

## Built for The Synthesis Hackathon 🏗️
