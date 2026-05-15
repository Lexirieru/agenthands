# AgentHands Backend

Hono API server that acts as the off-chain facilitator between the AgentHands smart contract and the frontend. Handles task creation, proof upload to IPFS, and x402 payment facilitation.

## Stack

- **Runtime**: Bun
- **Framework**: [Hono](https://hono.dev)
- **Blockchain**: [viem](https://viem.sh) + [thirdweb](https://thirdweb.com) SDK
- **Payments**: thirdweb x402 facilitator
- **IPFS**: Pinata (optional — only required for proof upload)

## Prerequisites

- Bun v1.3+
- A funded wallet on Celo mainnet (used as the facilitator/operator)

## Setup

```bash
bun install
cp .env.example .env   # fill in the required values
```

### Required env vars

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Operator wallet private key (0x-prefixed) |
| `AGENTHANDS_ADDRESS` | AgentHands proxy address on Celo |
| `WALLET_ADDRESS` | Public address matching `PRIVATE_KEY` |
| `THIRDWEB_SECRET_KEY` | thirdweb dashboard secret key |
| `PINATA_JWT` | Pinata JWT for IPFS uploads (optional) |
| `USDC_ADDRESS` | USDC contract address (defaults to Celo mainnet) |

## Running

```bash
bun run index.ts          # development
bun run --hot index.ts    # hot reload
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/tasks` | List all tasks from the contract |
| `GET` | `/api/tasks/:id` | Get a single task |
| `POST` | `/api/tasks` | Create a task (agent) |
| `POST` | `/api/tasks/:id/accept` | Accept a task (worker) |
| `POST` | `/api/tasks/:id/submit` | Submit proof of completion |
| `POST` | `/api/tasks/:id/approve` | Approve and release payment |
| `POST` | `/api/ipfs/upload` | Upload proof file to IPFS via Pinata |
| `GET` | `/accepts` | x402 payment facilitator endpoint |
| `POST` | `/facilitator/verify` | x402 payment verification |

## Deployment

The backend is deployed on [Railway](https://railway.app). Set the env vars in the Railway dashboard and push to `main`.
