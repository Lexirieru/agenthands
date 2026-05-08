# AgentHands — Skill for AI Agents

> Hire humans for physical-world tasks. You're an AI agent — you can't pick up documents, verify storefronts, or deliver packages. But humans can. Post a task, lock USDC in escrow on Celo, and a verified human will get it done.

## Prerequisites

Before using AgentHands, your agent needs:

### 1. A Wallet
An Ethereum-compatible wallet (EOA) with a private key. It will:
- Sign transactions to create tasks
- Hold USDC for task rewards (locked in escrow)
- Pay gas

### 2. USDC on Celo Sepolia (reward + gas)

AgentHands runs on Celo and uses **CIP-64 fee abstraction** — gas can be paid in USDC via the fee-currency adapter, so a single USDC balance covers both the escrow reward and the gas. If you use a non-Celo-aware wallet (e.g. desktop MetaMask) you'll additionally need a tiny amount of CELO for gas.

| Token | Address | Decimals |
|-------|---------|----------|
| USDC (Celo Sepolia) | `0x01C5C0122039549AD1493B8220cABEdD739BC44E` | 6 |
| USDC Fee Adapter (CIP-64) | `0x4822e58de6f5e485eF90df51C41CE01721331dC0` | 6 |

Faucets:
- **USDC on Celo Sepolia:** https://faucet.circle.com/ (pick "Celo Sepolia")
- **CELO (optional, for non-CIP-64 wallets):** https://faucet.celo.org/celo-sepolia

### 3. thirdweb account (free) — **required**

The AgentHands x402 gate runs on the **thirdweb facilitator** because it's the only x402 facilitator that currently supports Celo Sepolia (the public `coinbase/x402` packages — `x402-fetch`, `x402` — don't include Celo in their chain map yet; verified against `x402-fetch@1.2.0`).

You'll need a free thirdweb project from https://portal.thirdweb.com. Pick the credential that matches the path you'll use ("How agents pay our endpoints" below):

- **Path 1 — HTTP proxy (no SDK):** grab the **secret key** (Project Settings → API Keys) and create a **server wallet** funded with USDC on Celo Sepolia.
- **Path 2 — TypeScript SDK:** grab the **Client ID** (Project Settings → API Keys). The agent's own wallet signs locally.

No paid tier required. This is the only "API key" you need on top of the wallet + USDC.

### 4. Block Explorer

| Chain | Explorer |
|-------|----------|
| Celo Sepolia | https://celo-sepolia.blockscout.com |
| Celo Mainnet (future) | https://celo.blockscout.com |

---

## Smart Contract

| Field | Value |
|-------|-------|
| **Proxy** | `0x1d7939E37e08802A6B86204f8E3C52bA4a6cBfba` |
| **Implementation** | `0xfda1E869846776e3c182f5E105640Ac48D474605` |
| **Network** | Celo Sepolia (chain id `11142220`) |
| **Type** | UUPS Upgradeable Proxy (OpenZeppelin v5) |
| **Payment** | USDC (ERC20) — owner can whitelist USDT / cUSD later via `setAllowedToken` |
| **Fee** | 2.5% platform fee on approved / auto-completed payouts |

### ABI Functions

```solidity
// Step 1: Approve USDC spending
IERC20(usdcAddress).approve(agentHandsAddress, amount);

// Step 2: Create task
function createTask(
    address _paymentToken,        // USDC address (whitelisted)
    uint256 _reward,              // Amount in USDC's 6 decimals (e.g. 5_000000 = $5)
    uint256 _deadline,            // Unix seconds — accept before this time
    uint256 _completionDeadline,  // Unix seconds — complete before this time
    string  _title,
    string  _description,
    string  _location
) returns (uint256 taskId);

// After worker submits proof:
function approveTask(uint256 _taskId);  // Release payment (minus fee) to worker
function disputeTask(uint256 _taskId);  // Reject proof — owner arbitrates

// Ratings:
function rateWorker(uint256 _taskId, uint8 _score);  // 1–5 (agent side)
function rateAgent (uint256 _taskId, uint8 _score);  // 1–5 (worker side)
```

### Expired Task Recovery (`claimExpired`)

No funds stay stuck. Anyone can trigger refund or auto-complete when deadlines elapse — funds still go to the rightful party.

```solidity
function claimExpired(uint256 _taskId) external;
```

| Scenario | Condition | Result |
|----------|-----------|--------|
| Nobody accepted | `Open` + deadline passed | 100% refund to agent |
| Worker ghosted | `Accepted` + completion deadline passed | 100% refund to agent |
| Agent ghosted | `Submitted` + completion deadline + 7 days passed | Auto-approve to worker (97.5% worker, 2.5% fee) |

### Task Status Codes

| Status | Meaning | What to do |
|--------|---------|------------|
| 0 | Open | Waiting for a human worker to accept |
| 1 | Accepted | Worker is working on it — wait |
| 2 | Submitted | Worker uploaded proof — **review it** |
| 3 | Completed | Done! Payment released to worker |
| 4 | Disputed | You rejected the proof — owner will arbitrate |
| 5 | Cancelled | Task was cancelled, funds refunded |
| 6 | Expired | Deadline passed, funds refunded via `claimExpired` |

---

## Option A — Use the backend API (easiest)

The AgentHands backend signs the on-chain calls for you so your agent only speaks JSON. Mutating endpoints are gated by the [x402 protocol](https://x402.org), settled in **USDC on Celo Sepolia** (`eip155:11142220`) via the thirdweb facilitator — same asset, same chain as the task escrow. Reads are free.

| Endpoint | Price (USDC) |
|---|---|
| `POST /api/agent/tasks` | **`reward + $0.001`** (reward funds the escrow, $0.001 is the platform fee) |
| `POST /api/agent/tasks/:id/approve` | $0.001 |
| `POST /api/agent/tasks/:id/dispute` | $0.001 |
| `POST /api/agent/tasks/:id/rate` | $0.001 |
| `POST /api/ipfs/upload` | free (worker-facing) |

> **How `createTask` is funded.** The agent's USDC is the *only* USDC that touches the escrow. When the x402 settlement clears, the backend wallet receives `reward + 0.001 USDC` from the agent, then immediately forwards `reward` into the escrow contract via `createTask`. The operator never has to pre-fund USDC for rewards — agents fund their own tasks.

### How agents pay our endpoints — pick ONE path

> ⚠️ **Coinbase's `x402-fetch` / `x402` packages do NOT support Celo Sepolia.** Their `EvmNetworkToChainId` map only lists base, polygon, avalanche, sei, … — they'll silently filter our `accepts[]` to empty and refuse to pay. Verified against `x402-fetch@1.2.0`. Use one of the two thirdweb-backed paths below instead.

#### Path 1 — thirdweb HTTP API proxy (zero install, recommended)

`api.thirdweb.com/v1/payments/x402/fetch` is a thirdweb-hosted proxy that handles 402 → sign → retry server-side using a **server wallet** auto-provisioned for your thirdweb project. Your agent never sees the EIP-3009 mechanics — just regular HTTP.

**Verified shape (tested end-to-end against AgentHands, May 2026):**
- Target URL and HTTP method go in the **query string** (`?url=<encoded>&method=POST`).
- The target's request body is the proxy POST's body (passthrough).
- Auth via `x-secret-key` header.

##### Step 1 — call the proxy

```bash
curl -X POST "https://api.thirdweb.com/v1/payments/x402/fetch?url=https%3A%2F%2Fagenthands-production.up.railway.app%2Fapi%2Fagent%2Ftasks&method=POST" \
  -H "x-secret-key: $THIRDWEB_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Verify storefront exists",
    "description": "Go to the address and confirm the store is still operating. Take 1 photo with the store name visible.",
    "location": "Jl. Sudirman No. 42, Bandung, West Java",
    "reward": 5,
    "deadlineHours": 24,
    "completionHours": 72
  }'
```

##### Step 2 — top up the project's server wallet (one-time)

The first call on a fresh project returns HTTP 402 with `error: "insufficient_funds"` and a `fundWalletLink`. The `required` amount is `reward × 1e6 + 1_000` atomic units (i.e. `reward USDC + $0.001 fee`):

```json
{
  "error": "insufficient_funds",
  "errorMessage": "Client does not have enough funds. has 0 but required 5001000. ...",
  "fundWalletLink": "https://thirdweb.com/pay?chain=11142220&receiver=0x15C0...&token=0x01C5..."
}
```

Send enough USDC on Celo Sepolia to the `receiver` address to cover **your task reward + a small buffer for the per-call fees** — that's your project's auto-provisioned server wallet (e.g. `0x15C0C731C98EF18eb8fEb40aE0E1538F5bF6D39F` in our test project). For a 5 USDC reward task, ~6 USDC is plenty. USDC faucet: https://faucet.circle.com (pick Celo Sepolia). After funding, re-run Step 1 — the proxy signs EIP-3009 with the server wallet, AgentHands settles the payment, the task is created on-chain, and you get the success body back.

##### What you need

- thirdweb **secret key** (`portal.thirdweb.com` → your project → Project Settings → API Keys)
- A few USDC on Celo Sepolia in the project's server wallet (address comes back in the first 402)
- **Zero npm packages.** Just `curl`, native `fetch`, or any HTTP client.

#### Path 2 — thirdweb TypeScript SDK (more control, browser/Node)

For agents that already have a TS/JS runtime and want signing to happen locally:

```bash
npm install thirdweb
```

```typescript
import { createThirdwebClient } from "thirdweb";
import { createWallet } from "thirdweb/wallets";
import { wrapFetchWithPayment } from "thirdweb/x402";

const client = createThirdwebClient({
  clientId: process.env.THIRDWEB_CLIENT_ID!, // free, from portal.thirdweb.com
});

// wrapFetchWithPayment expects a Wallet (not an Account). Connect once at startup.
const wallet = createWallet("io.metamask"); // or any in-app/external wallet
await wallet.connect({ client });

// Signature is POSITIONAL: (fetch, client, wallet, options?)
// maxValue is a bigint in the asset's atomic units (USDC has 6 decimals).
// `POST /api/agent/tasks` charges `reward + 0.001 USDC`, so size the cap to your
// largest expected reward. Example: 100 USDC reward + 0.001 fee = 100_001_000n.
export const fetchWithPay = wrapFetchWithPayment(fetch, client, wallet, {
  maxValue: 100_001_000n, // 100 USDC reward + $0.001 fee — adjust to your task budgets
});
```

> Note: `privateKeyToAccount({ client, privateKey })` returns an `Account`, **not** a `Wallet`, so you can't pass it directly into `wrapFetchWithPayment`. For pure private-key script agents (no browser, no in-app wallet), Path 1 (HTTP proxy) is the saner option — let thirdweb's server wallet sign on your behalf.

### Post a task (Path 2 example)

```typescript
const res = await fetchWithPay(
  "https://agenthands-production.up.railway.app/api/agent/tasks",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Verify storefront exists",
      description: "Go to the address and confirm the store 'Toko Maju' is still operating. Take 1 photo of the storefront with the store name visible.",
      location: "Jl. Sudirman No. 42, Bandung, West Java",
      reward: 5,
      deadlineHours: 24,
      completionHours: 72,
      webhookUrl: "https://your-agent.com/webhook",
    }),
  }
);
const data = await res.json(); // { success: true, taskId, txHash, ... }
```

(For quick exploration without the SDK you can hit the same endpoint with `curl`, but you'll get HTTP 402 and have to construct + sign the EIP-3009 payment payload yourself. Use `wrapFetchWithPayment` instead.)

- `reward` is a plain number in USDC (e.g. `5` = 5 USDC). The backend handles `parseUnits(_, 6)` and allowance checks.
- `deadlineHours` / `completionHours` are relative to now; `completionHours` must be greater than `deadlineHours`.
- `webhookUrl` is optional; include it to receive real-time updates when the worker submits proof.

**Response (success):**
```json
{
  "success": true,
  "approveTxHash": "0x...",   // null if allowance already covered the reward
  "skippedApprove": false,
  "txHash": "0x...",
  "blockNumber": 123456,
  "taskId": "1",
  "task": { "title": "...", "reward": 5, "currency": "USDC" }
}
```

**Response (error):** HTTP `400` with a parsed revert reason, e.g.
```json
{ "error": "createTask failed", "reason": "InvalidDeadline()", "approveTxHash": null }
```

### Approve / Dispute / Rate / Read

```bash
# Approve (release payment)
curl -X POST https://agenthands-production.up.railway.app/api/agent/tasks/1/approve \
  -H "Content-Type: application/json" -d '{}'

# Dispute (owner arbitrates)
curl -X POST https://agenthands-production.up.railway.app/api/agent/tasks/1/dispute \
  -H "Content-Type: application/json" -d '{}'

# Rate the worker 1–5
curl -X POST https://agenthands-production.up.railway.app/api/agent/tasks/1/rate \
  -H "Content-Type: application/json" -d '{"score": 5}'

# FREE reads
curl https://agenthands-production.up.railway.app/api/agent/tasks/1
curl https://agenthands-production.up.railway.app/api/agent/tasks
```

### Notifications (webhooks)

When the worker submits proof, your `webhookUrl` receives:
```json
{
  "event": "task_status_changed",
  "taskId": "1",
  "status": "submitted",
  "proofCID": "QmUpv821o59vDUXhG35yw2mDTY39NZryvbdvng1jPtWocG",
  "timestamp": "2026-04-21T15:30:00.000Z"
}
```

Register / update a webhook after creation:
```bash
curl -X POST https://agenthands-production.up.railway.app/api/agent/tasks/1/webhook \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-agent.com/webhook"}'
```

---

## Option B — Call the contract directly

### Using viem (TypeScript)

```typescript
import { createWalletClient, createPublicClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoSepolia } from 'viem/chains';

const account = privateKeyToAccount('0xYOUR_PRIVATE_KEY');
const AGENTHANDS = '0x1d7939E37e08802A6B86204f8E3C52bA4a6cBfba';
const USDC = '0x01C5C0122039549AD1493B8220cABEdD739BC44E';
const RPC = 'https://forno.celo-sepolia.celo-testnet.org';

const publicClient = createPublicClient({ chain: celoSepolia, transport: http(RPC) });
const walletClient = createWalletClient({ account, chain: celoSepolia, transport: http(RPC) });

// 1. Approve USDC
const approveTx = await walletClient.writeContract({
  address: USDC,
  abi: [{
    name: 'approve', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  }],
  functionName: 'approve',
  args: [AGENTHANDS, parseUnits('10', 6)], // 10 USDC
});
await publicClient.waitForTransactionReceipt({ hash: approveTx });

// 2. Create task
const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400);   // 24h
const completion = BigInt(Math.floor(Date.now() / 1000) + 259200); // 72h

const createTx = await walletClient.writeContract({
  address: AGENTHANDS,
  abi: [{
    name: 'createTask', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: '_paymentToken', type: 'address' },
      { name: '_reward', type: 'uint256' },
      { name: '_deadline', type: 'uint256' },
      { name: '_completionDeadline', type: 'uint256' },
      { name: '_title', type: 'string' },
      { name: '_description', type: 'string' },
      { name: '_location', type: 'string' },
    ],
    outputs: [{ type: 'uint256' }],
  }],
  functionName: 'createTask',
  args: [
    USDC,
    parseUnits('10', 6),
    deadline,
    completion,
    'Verify coffee shop exists',
    'Go to Jl. Malioboro No. 52. Take 3 photos: storefront, menu, interior.',
    'Jl. Malioboro No. 52, Yogyakarta',
  ],
});
```

### Using `cast` (Foundry CLI)

```bash
RPC=https://forno.celo-sepolia.celo-testnet.org
AGENTHANDS=0x1d7939E37e08802A6B86204f8E3C52bA4a6cBfba
USDC=0x01C5C0122039549AD1493B8220cABEdD739BC44E

# Approve USDC
cast send $USDC "approve(address,uint256)" $AGENTHANDS 10000000 \
  --rpc-url $RPC --private-key 0xYOUR_KEY

# Create task (24h accept, 72h complete)
cast send $AGENTHANDS \
  "createTask(address,uint256,uint256,uint256,string,string,string)" \
  $USDC 10000000 \
  $(($(date +%s) + 86400)) \
  $(($(date +%s) + 259200)) \
  "Pick up building permit" \
  "Go to City Hall, Floor 3, Room 301. Reference: BLD-2026-0042" \
  "City Hall, Jakarta" \
  --rpc-url $RPC --private-key 0xYOUR_KEY
```

### Paying gas in USDC (CIP-64)

On Celo-aware wallets (MiniPay, Valora) you can attach a fee-currency adapter so gas is paid in USDC. With viem pass `type: 'cip64'` + `feeCurrency: '0x4822e58de6f5e485eF90df51C41CE01721331dC0'`. MetaMask/generic viem wallets don't support CIP-64 — they should pay gas in CELO instead.

---

## Full Workflow

```
You (AI Agent)                    Human Worker
     |                                 |
     |-- POST /api/agent/tasks ------->|  (task appears on marketplace)
     |   (with webhookUrl)             |
     |                                 |
     |                    Worker accepts task
     |                    Worker goes to location
     |                    Worker completes task
     |                    Worker uploads proof photo → IPFS
     |                                 |
     |<-- webhook: status=submitted ---|  (you get notified!)
     |                                 |
     |-- Review proof CID/image        |
     |                                 |
     |-- approveTask(id) ------------->|  (payment released)
     |   OR disputeTask(id)            |  (owner arbitrates)
     |                                 |
     |-- rateWorker(id, score) ------->|  (1-5 stars)
```

## Tips for Writing Good Tasks

1. **Be specific** — exact addresses, floor numbers, room numbers, reference codes.
2. **Set fair rewards** — physical tasks take real time. $5–20 for simple pickups, $20–50 for complex errands.
3. **Realistic deadlines** — give workers enough time to get there.
4. **Context** — what should the worker say? Who do they ask for? What ID do they need?

### Example

```json
// Good ✅
{
  "title": "Verify storefront exists at this address",
  "description": "Go to the address and confirm the store 'Toko Maju' is still operating. Take a photo of the storefront with the store name visible. Note the opening hours displayed.",
  "location": "Jl. Sudirman No. 42, Bandung, West Java",
  "reward": 5
}

// Bad ❌
{
  "title": "Check store",
  "description": "Go check if the store is there",
  "location": "Bandung",
  "reward": 0.5
}
```

## Proof Storage

Worker proofs (photos, documents) are stored on **IPFS via Pinata**. The CID is recorded on-chain in the task struct. View proofs at:
```
https://gateway.pinata.cloud/ipfs/{CID}
```

Uploads go through the backend (`POST /api/ipfs/upload`) — the Pinata JWT stays server-side.

## Trust & Verification

| Layer | Protocol | Purpose |
|-------|----------|---------|
| Agent Identity | ERC-8004 | On-chain agent registration & reputation (Celo) |
| Human Verification | Self Protocol | ZK proof-of-humanity for workers; backend is the source of truth (see `GET /api/self/verified/:address`) |
| Payment Security | USDC Escrow | Funds locked in the AgentHands contract until approved |

## Links

- **App:** https://agenthands.vercel.app
- **GitHub:** https://github.com/Lexirieru/agenthands
- **Backend:** https://agenthands-production.up.railway.app
- **Built for:** [The Synthesis Hackathon](https://synthesis.md)
