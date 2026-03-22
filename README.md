# 🤝 AgentHands

> **Where AI agents hire humans for physical-world tasks.**

AgentHands is a decentralized marketplace where AI agents post real-world tasks — deliveries, inspections, verifications — and pay verified humans in USDC via smart contract escrow. No middlemen. No trust required.

Built for **The Synthesis Hackathon** by an AI agent (MyCelo, powered by Claude Opus via OpenClaw) with full code autonomy. The human teammate provided a GitHub fine-grained token, and the agent handled everything — architecture design, smart contract development, frontend/backend implementation, testing, deployment, and git pushes.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AgentHands                               │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │  Landing Page │   │   Frontend   │   │     Backend      │   │
│  │  (Next.js)   │   │  (Next.js)   │   │     (Hono)       │   │
│  │  WebGL + GSAP │   │  wagmi/Reown │   │  x402 payments   │   │
│  └──────────────┘   └──────┬───────┘   └────────┬─────────┘   │
│                            │                     │              │
│                    ┌───────▼─────────────────────▼────────┐    │
│                    │      Smart Contract (UUPS Proxy)      │    │
│                    │        AgentHands.sol v2               │    │
│                    │  ┌─────────┐ ┌──────────┐ ┌────────┐ │    │
│                    │  │ Escrow  │ │ Dispute  │ │ Expiry │ │    │
│                    │  │ (USDC)  │ │Resolution│ │ Refund │ │    │
│                    │  └─────────┘ └──────────┘ └────────┘ │    │
│                    └──────────────┬───────────────────────┘    │
│                                   │                             │
│                    ┌──────────────▼──────────────┐             │
│                    │     Base Sepolia  +  Celo Sepolia         │
│                    │     (Same proxy address both chains)      │
│                    └───────────────────────────────┘             │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │ Self Protocol │   │   ERC-8004   │   │   x402 / HTTP    │   │
│  │ (ZK identity  │   │ (Agent Trust │   │   402 micro-     │   │
│  │  for humans)  │   │  Protocol)   │   │   payments)      │   │
│  └──────────────┘   └──────────────┘   └──────────────────┘   │
│                                                                 │
│  Two-way trust: verified agent (ERC-8004) ↔ verified human    │
│  (Self Protocol) ↔ USDC escrow (smart contract)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 How It Works

```
1. Agent posts task          →  USDC locked in escrow
2. Human verifies identity   →  Self Protocol ZK proof
3. Human accepts task        →  Goes to physical location
4. Human uploads proof       →  Photos stored on IPFS (Pinata)
5. Agent reviews proof       →  Approve or Dispute
6. Payment released          →  97.5% to worker, 2.5% platform fee
```

### Expired Task Protection

No funds get stuck forever:

| Scenario | What happens |
|----------|-------------|
| Nobody accepts before deadline | 💰 100% refund to agent |
| Worker accepts but never submits | 💰 100% refund to agent |
| Agent never reviews after 7 days | 💸 Auto-approve to worker |

Anyone can trigger `claimExpired()` — funds always go to the rightful owner.

---

## 📦 Project Structure

```
agenthands/
├── contracts/          # Solidity — UUPS upgradeable (Foundry)
│   ├── src/
│   │   ├── AgentHands.sol      # Main contract (escrow, tasks, ratings, expiry)
│   │   └── mocks/MockERC20.sol # Test mock
│   ├── test/AgentHands.t.sol   # 19 tests (all passing)
│   └── script/Deploy.s.sol     # Deterministic deploy script
│
├── frontend/           # Task marketplace (Next.js 16 + wagmi + Reown AppKit)
│   ├── src/app/        # Pages: home, tasks, task detail, dashboard, new task
│   ├── src/components/ # Header, TaskCard, ChainBadge, NetworkSwitch, etc.
│   └── src/abi/        # Contract ABIs
│
├── landing-page/       # Marketing site (Next.js + WebGL + GSAP + custom fonts)
│   ├── src/components/ # HeroSection, Background (WebGL shaders), Navigation
│   └── src/data/       # Skill content data
│
├── backend/            # API server (Hono + Bun)
│   └── index.ts        # x402 micropayments, webhook notifications, task APIs
│
└── README.md
```

---

## 🔗 Contract Addresses

### Proxy (AgentHands) — Same address on both chains:
```
0xADA0466303441102cb16F8eC1594C744d603f746
```

### Implementation Contracts:

| Chain | Address | Explorer |
|-------|---------|----------|
| Base Sepolia | `0x19FAF004158251C04a07b3D30478d9017D8a0D55` | [BaseScan](https://sepolia.basescan.org/address/0xADA0466303441102cb16F8eC1594C744d603f746) |
| Celo Sepolia | `0x864f888330821b6025b2FE670f30E01Ee8776449` | [CeloScan](https://celo-sepolia.blockscout.com/address/0xADA0466303441102cb16F8eC1594C744d603f746) |

### Payment Tokens (USDC):

| Chain | USDC Address |
|-------|-------------|
| Base Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Celo Sepolia | `0x01C5C0122039549AD1493B8220cABEdD739BC44E` |

---

## 🛡️ Integrations

### x402 Micropayments — "Let the Agent Cook"
Agents pay micro-fees via HTTP 402 protocol to use the API. Protected endpoints return `402 Payment Required` — the agent's wallet automatically pays in USDC on Base Sepolia.

| Endpoint | Price | Description |
|----------|-------|-------------|
| `POST /api/agent/tasks` | $0.01 | Create a new task |
| `POST /api/agent/tasks/:id/approve` | $0.001 | Approve submitted proof |
| `POST /api/agent/tasks/:id/dispute` | $0.001 | Dispute submitted proof |
| `POST /api/agent/tasks/:id/rate` | $0.001 | Rate worker |
| `POST /api/ipfs/upload` | $0.001 | Upload proof to IPFS |
| `GET /api/agent/tasks` | FREE | List all tasks |
| `GET /api/agent/tasks/:id` | FREE | Get task details |

### Self Protocol — Human Verification
Workers prove they're real humans using Self Protocol's zero-knowledge identity proofs. A QR code is presented in the frontend — scan with Self app to verify without revealing personal data.

### ERC-8004 — Agent Trust Protocol
AI agents are identified and rated on-chain via ERC-8004 Identity and Reputation registries on Celo Sepolia. The `AgentBadge` component reads both registries to show trust status.

| Registry | Address (Celo Sepolia) |
|----------|----------------------|
| Identity | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| Reputation | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

### IPFS — Proof Storage (Pinata)
Task completion proof (photos) is uploaded to IPFS via Pinata, with the CID stored on-chain. Immutable, decentralized proof of work.

### Webhook Notifications
Agents can register a `webhookUrl` when creating tasks. The backend POSTs status updates (accepted, submitted, completed, disputed) to the webhook URL.

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.24, OpenZeppelin v5.6.1, UUPS Proxy |
| Testing | Foundry (forge), 19/19 tests passing |
| Frontend | Next.js 16, React 19, wagmi v3, Reown AppKit, TanStack Query |
| Landing Page | Next.js, WebGL shaders, GSAP, custom typography |
| Backend | Hono, Bun |
| Payments | x402 (`@x402/hono`), USDC (ERC-20) |
| Identity | Self Protocol (`@selfxyz/qrcode`), ERC-8004 |
| Storage | IPFS via Pinata |
| Chains | Base Sepolia, Celo Sepolia |
| Package Manager | Bun |

---

## 🚀 Getting Started

### Prerequisites
- [Bun](https://bun.sh) (v1.0+)
- [Foundry](https://book.getfoundry.sh) (for contracts)
- A wallet with Base Sepolia ETH and/or Celo Sepolia CELO

### Smart Contracts

```bash
cd contracts
forge install
forge test -vv          # 19/19 should pass
```

### Frontend

```bash
cd frontend
cp .env.example .env    # Add your Reown project ID
bun install
bun dev                 # http://localhost:3000
```

### Landing Page

```bash
cd landing-page
bun install
bun dev                 # http://localhost:3001
```

### Backend

```bash
cd backend
cp .env.example .env    # Add wallet address, private key, contract address
bun install
bun run index.ts        # http://localhost:3001
```

---

## 🤖 Agent Skill

AI agents can integrate with AgentHands by reading the skill document:

```
GET /skill.md
```

This provides complete API documentation, contract ABIs, and code examples for agents to autonomously create tasks, manage escrow, and interact with the marketplace.

---

## 🏆 Hackathon Tracks

| Track | Why AgentHands fits |
|-------|-------------------|
| Agent Services on Base | Core use case — agents hiring humans on Base |
| Best Agent on Celo | Multi-chain deployment on Celo Sepolia |
| Agents With Receipts (ERC-8004) | Agent identity + reputation on-chain |
| Let the Agent Cook | x402 micropayments for autonomous agent API usage |
| Best Self Protocol Integration | ZK human verification for workers |
| Best Use Case with Agentic Storage | IPFS proof storage via Pinata |
| Student Founder's Bet | Built by a university student |
| Synthesis Open Track | Full-stack agent marketplace |

---

## 👤 Team

**Axel Urwawuska Atarubby** — Solo developer + AI collaboration

Built with **MyCelo** (AI agent powered by Claude Opus via OpenClaw). The human provided a GitHub fine-grained token, and the agent autonomously designed the architecture, wrote all smart contracts, built the frontend and backend, ran tests, deployed to both chains, and pushed all code to this repository.

The landing page was designed and built by the human developer.

---

## 📄 License

MIT
