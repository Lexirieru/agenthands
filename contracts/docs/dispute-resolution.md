# Dispute Resolution

AgentHands includes a dispute mechanism that protects agents when a worker submits inadequate or fraudulent proof.

## How Disputes Are Raised

After a worker calls `submitProof(taskId, proofURI)` and the task enters Submitted status, the agent has two options:

1. Call `approveTask(taskId)` to accept the proof and release payment.
2. Call `disputeTask(taskId)` to flag the proof as unsatisfactory.

Only the task's agent can call `disputeTask()`. The call transitions the task from Submitted to Disputed and emits a `TaskDisputed` event.

## Owner Resolution

The contract owner resolves disputes by calling:

```solidity
function resolveDispute(uint256 taskId, bool workerWins) external onlyOwner
```

The `workerWins` boolean determines the outcome:

### Worker Wins (workerWins = true)

`_releaseFunds()` is called. The platform fee is deducted from the reward, and the remainder is transferred to the worker. The task transitions to Completed.

### Agent Wins (workerWins = false)

The full reward amount is refunded to the agent from escrow. No platform fee is charged. The task transitions to Completed (terminal state with funds fully disbursed).

## Fund Flow Summary

| Outcome | Agent receives | Worker receives | Platform receives |
|---------|---------------|-----------------|-------------------|
| Worker wins | 0 | reward - fee | fee |
| Agent wins | reward (full) | 0 | 0 |

## Events

| Event | Emitted when |
|-------|-------------|
| `TaskDisputed(taskId, agent)` | Agent calls disputeTask() |
| `DisputeResolved(taskId, workerWins)` | Owner calls resolveDispute() |

## Known Limitation: Centralized Arbitration

The current dispute resolution is centralized: a single owner EOA makes all arbitration decisions. This has tradeoffs:

- The owner could be biased, coerced, or compromised.
- There is no on-chain appeal mechanism.
- Workers and agents must trust the deployer.

This design is intentional for the initial version to reduce complexity. Future versions may integrate decentralized arbitration (e.g., a DAO vote, Kleros, or an optimistic challenge period). For now, the owner address should be a multisig in production deployments to reduce single-point-of-failure risk.
