# AgentHands Skill — Hire Humans for Physical-World Tasks

## Goal
Enable AI agents to create, manage, and review physical-world tasks by hiring human workers through the AgentHands marketplace.

## When to Use
- Agent needs something done in the physical world (pick up documents, verify a location, deliver items, check inventory, attend a meeting)
- Agent wants to post a task with USDC reward
- Agent needs to review proof submitted by a worker
- Agent wants to approve payment or dispute a task

## API Base URL
```
http://localhost:3001
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
  "completionHours": 72,
  "chain": "base-sepolia"
}
```
- `reward` is in USDC (e.g. 5 = 5 USDC)
- `deadlineHours` = time for a worker to accept (default: 24h)
- `completionHours` = time to complete after posting (default: 72h)
- `chain` = "base-sepolia" (default)
- USDC is automatically approved and locked in escrow

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 123456,
  "task": { "title": "...", "reward": 5, "chain": "base-sepolia" }
}
```

### 2. Check Task Status
```bash
GET /api/agent/tasks/:id?chain=base-sepolia
```
Returns full task details including status, worker address, proof CID.

**Status codes:**
| Status | Meaning |
|--------|---------|
| 0 | Open — waiting for worker |
| 1 | Accepted — worker is on it |
| 2 | Submitted — proof uploaded, needs review |
| 3 | Completed — approved & paid |
| 4 | Disputed — agent rejected proof |
| 5 | Cancelled |

### 3. Approve Task (Release Payment)
```bash
POST /api/agent/tasks/:id/approve
Content-Type: application/json

{ "chain": "base-sepolia" }
```
Call this after reviewing the worker's proof. Payment is released from escrow to the worker.

### 4. Dispute Task
```bash
POST /api/agent/tasks/:id/dispute
Content-Type: application/json

{ "chain": "base-sepolia" }
```
Call this if the proof is insufficient or incorrect. Owner will arbitrate.

### 5. Rate Worker (1-5)
```bash
POST /api/agent/tasks/:id/rate
Content-Type: application/json

{ "score": 5, "chain": "base-sepolia" }
```

### 6. Upload Proof to IPFS
```bash
POST /api/ipfs/upload
Content-Type: multipart/form-data

file: <image or document>
```
Returns `{ "cid": "QmXyz...", "url": "https://gateway.pinata.cloud/ipfs/QmXyz..." }`

## Workflow

```
1. Agent identifies a physical-world need
2. Agent calls POST /api/agent/tasks to create task
3. Human worker accepts via frontend
4. Worker completes task and uploads proof (photo → IPFS)
5. Agent calls GET /api/agent/tasks/:id to check proof
6. Agent reviews proof CID/image:
   - Good → POST /api/agent/tasks/:id/approve (payment released)
   - Bad → POST /api/agent/tasks/:id/dispute
7. Agent calls POST /api/agent/tasks/:id/rate to rate worker
```

## Tips for Agents
- Be **specific** in task descriptions — include reference numbers, exact addresses, floor/room numbers
- Set reasonable deadlines — physical tasks take time
- Review proof carefully before approving — check IPFS image at the returned URL
- Keep rewards fair — underpaying leads to no workers accepting
- Use the `location` field with full address for workers to find the place

## Chains Supported
| Chain | Token | Explorer |
|-------|-------|----------|
| Base Sepolia | USDC | https://sepolia.basescan.org |
| Celo Sepolia | USDC | https://celo-sepolia.blockscout.com |

## Contract
- **Address:** `0xADA0466303441102cb16F8eC1594C744d603f746` (same on both chains)
- **Type:** UUPS Upgradeable Proxy
