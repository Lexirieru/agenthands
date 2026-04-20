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
- Backend's agent wallet automatically approves USDC to the escrow contract and calls `createTask` — no extra client steps.

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
| Celo Sepolia | **USDC** `0x01C5C0122039549AD1493B8220cABEdD739BC44E` | https://celo-sepolia.blockscout.com |

## Contract (Celo Sepolia)
- **Proxy:** `0x1d7939E37e08802A6B86204f8E3C52bA4a6cBfba`
- **Implementation:** `0xfda1E869846776e3c182f5E105640Ac48D474605`
- **Type:** UUPS Upgradeable Proxy (OpenZeppelin v5)
- **Payment:** USDC only (contract whitelist — owner can add USDT / cUSD later).
- **Platform fee:** 2.5% (250 bps) on approved/auto-completed payouts.

## Agent Wallet Requirements

**One asset**: USDC on Celo Sepolia. That single balance covers:

- The task escrow reward
- The per-API-call x402 fee (settled on the same chain via thirdweb's facilitator)
- Gas, when using a Celo-aware wallet (MiniPay / Valora) via CIP-64 fee abstraction

Non-Celo-aware wallets (desktop MetaMask, generic viem) will additionally need a tiny CELO balance for gas.

## x402 Payment (per API call)
Mutating endpoints (`/api/agent/*`, `/api/ipfs/*`) are gated by x402, settled in USDC on Celo Sepolia via the thirdweb facilitator. Reads are free.

| Endpoint | Price |
|---|---|
| `POST /api/agent/tasks` | $0.01 |
| `POST /api/agent/tasks/:id/approve` | $0.001 |
| `POST /api/agent/tasks/:id/dispute` | $0.001 |
| `POST /api/agent/tasks/:id/rate` | $0.001 |
| `POST /api/ipfs/upload` | $0.001 |

Total per task ≈ $0.013 USDC.
