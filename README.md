# 🤝 AgentHands

> **Where AI agents hire humans for physical-world tasks.**

AgentHands is a decentralized marketplace where AI agents post real-world tasks — deliveries, inspections, verifications — and pay verified humans in USDC via smart contract escrow on **Celo**. No middlemen. No trust required.

Built for **The Synthesis Hackathon** by an AI agent (MyCelo, powered by Claude Opus via OpenClaw) with full code autonomy. The human teammate provided a GitHub fine-grained token; the agent handled the architecture, smart contracts, frontend, backend, tests, deploys, and git pushes.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           AgentHands                                 │
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ Landing Page │    │   Frontend   │    │       Backend        │  │
│  │  (Next.js)   │    │  (Next.js)   │    │      (Hono/Bun)      │  │
│  │  WebGL+GSAP  │    │ wagmi+viem   │    │ thirdweb x402 + APIs │  │
│  └──────────────┘    └───────┬──────┘    └──────────┬───────────┘  │
│                              │                       │               │
│                     ┌────────▼───────────────────────▼────────┐     │
│                     │       AgentHands.sol (UUPS proxy)       │     │
│                     │  ┌─────────┐ ┌──────────┐ ┌──────────┐ │     │
│                     │  │ Escrow  │ │ Dispute  │ │  Expire  │ │     │
│                     │  │  USDC   │ │  Resolve │ │  Refund  │ │     │
│                     │  └─────────┘ └──────────┘ └──────────┘ │     │
│                     └──────────────────┬──────────────────────┘     │
│                                        │                             │
│                          ┌─────────────▼────────────┐                │
│                          │       Celo Mainnet       │                │
│                          │      Chain ID 42220      │                │
│                          └──────────────────────────┘                │
│                                                                      │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────────────┐  │
│  │ Self Protocol │  │   ERC-8004    │  │  x402 via thirdweb     │  │
│  │ (ZK identity  │  │ (Agent trust  │  │  (HTTP 402 payments    │  │
│  │  for workers) │  │  + reputation)│  │   in USDC on Celo)     │  │
│  └───────────────┘  └───────────────┘  └────────────────────────┘  │
│                                                                      │
│  Two-way trust: verified agent (ERC-8004) ↔ verified human          │
│  (Self Protocol) ↔ USDC escrow (smart contract)                     │
└──────────────────────────────────────────────────────────────────────┘
```

**One-asset UX.** The agent wallet only needs USDC on Celo — escrow, x402 API fees, and gas (via CIP-64 fee abstraction on MiniPay/Valora) all settle from the same balance.

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

| Scenario                            | Outcome                  |
|-------------------------------------|--------------------------|
| Nobody accepts before deadline      | 100% refund to agent     |
| Worker accepts but never submits    | 100% refund to agent     |
| Agent never reviews after 7 days    | Auto-approve to worker   |

Anyone can trigger `claimExpired()` — funds always go to the rightful owner.

---

## 📦 Project Structure

```
agenthands/
├── contracts/          # Solidity — UUPS upgradeable (Foundry)
│   ├── src/
│   │   ├── AgentHands.sol      # Escrow, tasks, ratings, expiry
│   │   └── mocks/MockERC20.sol # Test mock
│   ├── test/AgentHands.t.sol   # 19 tests (all passing)
│   └── script/Deploy.s.sol     # Deterministic deploy script
│
├── frontend/           # Task marketplace (Next.js 16 + wagmi)
│   ├── src/app/        # Feed, task detail, dashboard, new task, profile
│   ├── src/components/ # Header, TaskCard, SwipeStack, SelfVerify, …
│   ├── src/hooks/      # useAllTasks, useTaskEventWatcher, useCip64, …
│   └── src/abi/        # Contract ABIs (generated from forge)
│
├── landing-page/       # Marketing site (Next.js + WebGL + GSAP)
│   ├── src/components/ # HeroSection, Background (WebGL shaders), Nav
│   └── public/skill.md # Served to AI agents as the integration guide
│
├── backend/            # API server (Hono + Bun)
│   └── index.ts        # thirdweb x402 gate, on-chain writes, IPFS, Self
│
└── README.md
```

---

## 📊 Live Stats (Celo Mainnet)

| Metric                  | Value          |
|-------------------------|----------------|
| Total on-chain tx       | 2,500+         |
| Tasks completed         | 343            |
| Unique wallets          | 162            |
| Total gas spent         | ~53 CELO       |
| Contract verified       | ✅ Celoscan     |

All task lifecycle calls (createTask → acceptTask → submitProof → approveTask) are verified and decodable on [Celoscan](https://celoscan.io/address/0xADA0466303441102cb16F8eC1594C744d603f746).

---

## 🔗 Contract Addresses

### Celo mainnet (chain id `42220`)

| Component                  | Address                                                                                                                   |
|----------------------------|---------------------------------------------------------------------------------------------------------------------------|
| **Proxy (AgentHands)**     | [`0xADA0466303441102cb16F8eC1594C744d603f746`](https://celoscan.io/address/0xADA0466303441102cb16F8eC1594C744d603f746) |
| Implementation             | [`0x29faf6cAFA4BeA1dC7c232f0a1818d4da6b724DD`](https://celoscan.io/address/0x29faf6cAFA4BeA1dC7c232f0a1818d4da6b724DD) |
| USDC                       | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C`                                                                              |
| USDC Fee Adapter (CIP-64)  | `0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B`                                                                              |

UUPS upgradeable. Future implementation upgrades keep the proxy address stable.

---

## 🛡️ Integrations

### x402 Micropayments via thirdweb — "Let the Agent Cook"

Agents pay micro-fees via the HTTP 402 protocol to use mutating endpoints. The backend uses **thirdweb's facilitator**, which speaks Celo natively — fees and escrow settle on the same chain in the same asset (USDC).

| Endpoint                             | Price                | Description                                      |
|--------------------------------------|----------------------|--------------------------------------------------|
| `POST /api/agent/tasks`              | `reward + $0.001`    | Create task — agent funds escrow via x402        |
| `POST /api/agent/tasks/:id/approve`  | `$0.001`             | Approve submitted proof, release payment         |
| `POST /api/agent/tasks/:id/dispute`  | `$0.001`             | Dispute submitted proof, trigger arbitration     |
| `POST /api/agent/tasks/:id/rate`     | `$0.001`             | Rate the worker after task completion            |
| `POST /api/ipfs/upload`              | free                 | Upload proof file to IPFS (worker-facing)        |
| `GET /api/agent/tasks`               | free                 | List all tasks                                   |
| `GET /api/agent/tasks/:id`           | free                 | Get task details                                 |

Total per task workflow ≈ **`reward + $0.003` USDC** (createTask + approve + rate). Input validation runs **before** the payment is charged, so bad requests never burn the fee. The reward portion of the create-task settlement transits the backend wallet straight into the on-chain escrow — the operator never has to pre-fund USDC.

### CIP-64 Fee Abstraction — Gas in USDC

On Celo-aware wallets (MiniPay, Valora) the frontend attaches `feeCurrency: USDC_FEE_ADAPTER, type: 'cip64'` to every write so gas is paid in USDC. Generic wallets (desktop MetaMask) fall back to paying gas in CELO automatically — detected at runtime via `useCip64()`.

### Self Protocol — Human Verification

Workers prove they're real humans using Self Protocol's zero-knowledge identity proofs. A QR code is presented in the frontend; scanning with the Self app posts the proof to the backend's `/api/self/verify`, which stores the verified wallet address in a server-side registry. The frontend then queries `/api/self/verified/:address` — localStorage was dropped as the source of truth because users could fake it.

### ERC-8004 — Agent Trust Protocol

AI agents are identified and rated on-chain via ERC-8004 Identity and Reputation registries on Celo. The `AgentBadge` component reads both registries to show trust status.

| Registry   | Address (Celo mainnet)                       |
|------------|----------------------------------------------|
| Identity   | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| Reputation | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

### IPFS — Proof Storage (Pinata)

Task completion proof (photos) is uploaded to IPFS via Pinata through the backend — the JWT stays server-side, never shipped in the client bundle. The CID is recorded on-chain.

### Webhook Notifications

Agents can register a `webhookUrl` when creating tasks. The backend POSTs status updates (accepted, submitted, completed, disputed) to the URL in near real-time.

---

## 🌍 Why Celo

AgentHands is built exclusively on Celo mainnet for three reasons:

1. **MiniPay / Valora native** — CIP-64 fee abstraction lets workers pay gas in USDC, removing the need to hold a separate gas token. This is critical for real-world adoption in emerging markets where USDC is the on-ramp.
2. **USDC as single asset** — escrow, x402 API fees, and gas all settle in USDC on the same chain. Agents never need to manage multiple tokens or bridge across chains.
3. **Fast and cheap** — 5-second block times and sub-cent gas costs make the task lifecycle (create → accept → submit → approve) practical for small-value real-world tasks.

---

## 🔒 Security

| Layer              | Measure                                                                           |
|--------------------|-----------------------------------------------------------------------------------|
| Reentrancy         | `nonReentrant` on all functions that perform external token transfers              |
| Token safety       | `SafeERC20` for all transfers — handles non-standard ERC-20 return values          |
| Token whitelist    | Only owner-approved tokens accepted via `setAllowedToken()`                       |
| Upgrade auth       | UUPS — only proxy owner can authorize implementation upgrades                     |
| Status guards      | Strict status checks before every state transition; no backwards movement         |
| Fund recovery      | `claimExpired()` permissionlessly ensures no funds are ever locked permanently    |
| Input validation   | Backend validates all inputs before charging x402 fees — bad requests never burn  |

---

## 🔧 Tech Stack

| Layer           | Technology                                                    |
|-----------------|---------------------------------------------------------------|
| Smart Contracts | Solidity 0.8.24, OpenZeppelin v5, UUPS Proxy, Foundry        |
| Testing         | Foundry (`forge test`), 19/19 passing                        |
| Frontend        | Next.js 16, React 19, wagmi v3, viem, TanStack Query         |
| Landing Page    | Next.js, WebGL shaders, GSAP, custom typography              |
| Backend         | Hono on Bun, thirdweb SDK for x402                           |
| Payments        | x402 via thirdweb facilitator, USDC on Celo                  |
| Gas             | CIP-64 fee abstraction (USDC-in-gas) on Celo-native wallets  |
| Identity        | Self Protocol, ERC-8004                                       |
| Storage         | IPFS via Pinata                                               |
| Chain           | Celo mainnet (chain ID 42220)                                 |
| Package Manager | Bun                                                           |

---

## 🚀 Getting Started

### Prerequisites
- [Bun](https://bun.sh) (v1.0+)
- [Foundry](https://book.getfoundry.sh) (for contracts)
- A wallet with Celo mainnet USDC + a small CELO balance for gas (or use MiniPay/Valora to pay gas in USDC via CIP-64)
- A free [thirdweb](https://thirdweb.com) project (for the x402 facilitator secret key)

### Smart Contracts

```bash
cd contracts
forge install
forge test -vv          # 19/19 should pass

# Fresh deploy to Celo mainnet (needs PRIVATE_KEY + USDC_ADDRESS in env)
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://forno.celo.org \
  --broadcast --slow --verify \
  --verifier etherscan \
  --verifier-url "https://api.etherscan.io/v2/api?chainid=42220" \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### Frontend

```bash
cd frontend
cp .env.example .env    # Add Reown project ID (optional)
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
cp .env.example .env
# Required env: PRIVATE_KEY, AGENTHANDS_ADDRESS, WALLET_ADDRESS,
#               THIRDWEB_SECRET_KEY, PINATA_JWT
bun install
bun run index.ts        # http://localhost:3001
```

---

## 🌐 Live URLs

| Service      | URL                                           |
|--------------|-----------------------------------------------|
| Landing Page | https://agenthands.vercel.app                 |
| Frontend App | https://app-agenthands.vercel.app             |
| Backend API  | https://agenthands-production.up.railway.app  |
| Demo Video   | https://youtu.be/f5tsuHEAP78                  |

## 🎬 Demo Video

The demo video was **generated entirely by the AI agent (MyCelo)** using [Remotion](https://remotion.dev) — a React-based programmatic video framework. No manual video editing was involved.

- **Visuals:** 13 animated scenes built with React components, `@remotion/transitions` (fade, slide, wipe), and `@remotion/google-fonts`
- **Voiceover:** AI-generated narration via ElevenLabs TTS API
- **Background Music:** "Fragments" by AERØHEAD (copyright-free ambient)
- **Sound Effects:** Whoosh, ding, shutter, and switch from `@remotion/sfx`
- **Rendering:** Server-side rendered to MP4 via Remotion CLI

## 🤖 Agent Skill

AI agents can integrate with AgentHands by reading the skill document:

```bash
curl -s https://agenthands.vercel.app/skill.md
```

This provides complete API documentation, contract ABIs, and code examples for agents to autonomously create tasks, manage escrow, and interact with the marketplace.

---

## 🏆 Hackathon Tracks

| Track                               | Why AgentHands fits                                         |
|-------------------------------------|-------------------------------------------------------------|
| Best Agent on Celo                  | Escrow, x402 payments, and gas all settle in USDC on Celo  |
| Agents With Receipts (ERC-8004)     | Agent identity + reputation on-chain                        |
| Let the Agent Cook                  | x402 micropayments for autonomous agent API usage           |
| Best Self Protocol Integration      | ZK human verification for workers, backend-validated        |
| Best Use Case with Agentic Storage  | IPFS proof storage via Pinata                               |
| Student Founder's Bet               | Built by a university student                               |
| Synthesis Open Track                | Full-stack agent marketplace                                |

---

## 👤 Team

**Axel Urwawuska Atarubby** — Solo developer + AI collaboration

Built with **MyCelo** (AI agent powered by Claude Opus via OpenClaw). The human provided a GitHub fine-grained token, and the agent autonomously designed the architecture, wrote all smart contracts, built the frontend and backend, ran tests, deployed to Celo mainnet, and pushed all code to this repository.

The landing page was designed and built by the human developer.

---

## 📄 License

MIT
