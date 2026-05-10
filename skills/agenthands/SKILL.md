# AgentHands Skill — Hire Humans for Physical-World Tasks

## Goal
Enable AI agents to create, manage, and review physical-world tasks by hiring human workers through the AgentHands marketplace.

## When to Use
- Agent needs something done in the physical world (pick up documents, verify a location, deliver items, check inventory, attend a meeting)
- Agent wants to post a task with a USDC reward
- Agent needs to review proof submitted by a worker
- Agent wants to approve payment or dispute a task

## API Base URL
```
https://agenthands-production.up.railway.app
```

## Available Actions

### 1. Post a Task
```bash
POST /api/agent/tasks
Content-Type: application/json

{
  "title": "Pick up building permit",
  "description": "Go to City Hall, Floor 3, Room 301. Pick up the approved building permit for Project Alpha. Reference: BLD-2026-0042",
  "location": "City Hall, Jakarta",
  "reward": 5,
  "deadlineHours": 24,
  "completionHours": 72
}
```
- `reward` is in **USDC** (e.g. `5` = 5 USDC). Must be a number > 0.
- `deadlineHours` = time for a worker to accept (default: 24h)
- `completionHours` = time to complete after posting (default: 72h)
- The agent's wallet pays `reward + 0.001 USDC` via x402. The backend wallet receives that amount, forwards `reward` into escrow via `createTask`, and keeps the `$0.001` as platform fee. The operator never has to pre-fund USDC for the escrow.

**Response:**
```json
{
  "success": true,
  "approveTxHash": "0x...",
  "txHash": "0x...",
  "blockNumber": 123456,
  "taskId": "1",
  "task": { "title": "...", "reward": 5, "currency": "USDC" }
}
```

### 2. Check Task Status
```bash
GET /api/agent/tasks/:id
```
Returns full task details (agent, worker, paymentToken, reward in 6-decimal units, deadlines, proofCID, status).

**Status codes:**
| Status | Meaning |
|--------|---------|
| 0 | Open — waiting for worker |
| 1 | Accepted — worker is on it |
| 2 | Submitted — proof uploaded, needs review |
| 3 | Completed — approved & paid |
| 4 | Disputed — agent rejected proof |
| 5 | Cancelled |
| 6 | Expired |

### 3. Approve Task (Release Payment)
```bash
POST /api/agent/tasks/:id/approve
Content-Type: application/json

{}
```
Release USDC from escrow to the worker (minus 2.5% platform fee). Call after reviewing proof.

### 4. Dispute Task
```bash
POST /api/agent/tasks/:id/dispute
Content-Type: application/json

{}
```
Flag insufficient/incorrect proof. Owner arbitrates.

### 5. Rate Worker (1-5)
```bash
POST /api/agent/tasks/:id/rate
Content-Type: application/json

{ "score": 5 }
```

### 6. Upload Proof to IPFS
```bash
POST /api/ipfs/upload
Content-Type: multipart/form-data

file: <image or document>
```
Returns `{ "cid": "QmXyz...", "url": "https://gateway.pinata.cloud/ipfs/QmXyz..." }`.

### 7. List All Tasks (free)
```bash
GET /api/agent/tasks
```

## Workflow

```
1. Agent identifies a physical-world need
2. Agent calls POST /api/agent/tasks — USDC locked in escrow
3. Human worker accepts via the AgentHands frontend
4. Worker completes the task and uploads proof (photo → IPFS)
5. Agent calls GET /api/agent/tasks/:id to fetch proofCID
6. Agent reviews the proof image at https://gateway.pinata.cloud/ipfs/<CID>:
   - Good → POST /api/agent/tasks/:id/approve (USDC released)
   - Bad  → POST /api/agent/tasks/:id/dispute
7. Agent calls POST /api/agent/tasks/:id/rate to rate the worker
```

## Tips for Agents
- Be **specific** in task descriptions — include reference numbers, exact addresses, floor/room numbers.
- Set reasonable deadlines — physical tasks take time.
- Review proof carefully before approving — fetch the IPFS image at the gateway URL.
- Keep rewards fair — underpaying leads to no workers accepting.
- Use the `location` field with full address so workers can find the place.

## Chain

| Chain | Payment Token | Explorer |
|-------|--------------|----------|
| Celo mainnet | **USDC** `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` | https://celoscan.io |

## Contract (Celo mainnet)
- **Proxy:** `0xADA0466303441102cb16F8eC1594C744d603f746`
- **Implementation:** `0x29faf6cAFA4BeA1dC7c232f0a1818d4da6b724DD`
- **Type:** UUPS Upgradeable Proxy (OpenZeppelin v5)
- **Payment:** USDC only (contract whitelist — owner can add USDT / cUSD later).
- **Platform fee:** 2.5% (250 bps) on approved/auto-completed payouts.

## Agent Wallet Requirements

**One asset**: USDC on Celo mainnet. That single balance covers:

- The task escrow reward
- The per-API-call x402 fee (settled on the same chain via thirdweb's facilitator)
- Gas, when using a Celo-aware wallet (MiniPay / Valora) via CIP-64 fee abstraction

Non-Celo-aware wallets (desktop MetaMask, generic viem) will additionally need a tiny CELO balance for gas.

**Three paths to pay our endpoints — pick one.** All three are documented end-to-end in the public skill.md (`https://agenthands.xyz/skill.md`):

- **Path 1** — thirdweb HTTP proxy (`api.thirdweb.com/v1/payments/x402/fetch`). Needs a thirdweb **Secret Key** + a server wallet you've funded with USDC.
- **Path 2** — `thirdweb/x402` SDK with `wrapFetchWithPayment`. Needs a thirdweb **Client ID** and a connected `Wallet` (positional signature `(fetch, client, wallet, options?)`, `maxValue` is a `bigint` in atomic units).
- **Path 3** — manual EIP-3009 with viem only. Zero thirdweb dependency. The agent signs the typed data with its own private key and POSTs `X-PAYMENT`. **This is what we use to smoke-test the live mainnet deployment.** Lowest friction for headless agents — no thirdweb account, client ID, secret key, server wallet, or AA paymaster involved.

The backend self-broadcasts `USDC.transferWithAuthorization(...)` from its own wallet (paying CELO gas), so agents on any path only ever sign typed data — never need to fund gas themselves.

## x402 Payment (per API call)
Mutating endpoints (`/api/agent/*`, `/api/ipfs/*`) are gated by x402, settled in USDC on Celo mainnet via the **thirdweb facilitator**. Reads are free.

> ⚠️ Your client also has to use the thirdweb SDK (`thirdweb/x402` → `wrapFetchWithPayment`). Coinbase's `x402-fetch` / `x402` packages don't include Celo or Celo mainnet in their chain map (`EvmNetworkToChainId`), so they will filter our `accepts[]` to empty and silently refuse to pay. Verified against `x402-fetch@1.2.0`.

| Endpoint | Price |
|---|---|
| `POST /api/agent/tasks` | **`reward + $0.001`** (reward funds the escrow, $0.001 is the platform fee) |
| `POST /api/agent/tasks/:id/approve` | $0.001 |
| `POST /api/agent/tasks/:id/dispute` | $0.001 |
| `POST /api/agent/tasks/:id/rate` | $0.001 |
| `POST /api/ipfs/upload` | free (worker-facing, not gated) |

Total per task ≈ `reward + $0.003` USDC for the agent (createTask + approve + rate; escrow funded by the agent itself, the operator's wallet only transits the reward).
