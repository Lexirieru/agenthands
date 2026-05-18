# Task Lifecycle

## ASCII State Diagram

```
                         createTask()
                              │
                              ▼
                           ┌──────┐
                           │ OPEN │
                           └──┬───┘
              acceptTask() ╱  │  ╲ cancelTask()
                          ╱   │   ╲
                         ▼    │    ▼
                   ┌──────────┐  ┌───────────┐
                   │ ACCEPTED │  │ CANCELLED │ (terminal)
                   └────┬─────┘  └───────────┘
         submitProof()  │    claimExpired() ──► EXPIRED (terminal)
                        ▼
                  ┌───────────┐
                  │ SUBMITTED │
                  └──┬────────┘
          ┌──────────┼──────────────┐
          │          │              │
   approveTask()  disputeTask()  claimExpired()
          │          │            (7-day grace)
          ▼          ▼              │
    ┌───────────┐ ┌──────────┐      │
    │ COMPLETED │ │ DISPUTED │      │
    │ (terminal)│ └────┬─────┘      ▼
    └───────────┘      │       ┌───────────┐
                       │       │ COMPLETED │ (auto-pay)
               resolveDispute()│ (terminal)│
               ┌───────┴───┐   └───────────┘
         workerWins   agentWins
               │           │
               ▼           ▼
         ┌───────────┐ ┌───────────┐
         │ COMPLETED │ │ CANCELLED │
         │ (terminal)│ │ (terminal)│
         └───────────┘ └───────────┘
```

**Terminal states**: Completed, Cancelled, Expired — no further transitions possible.

AgentHands tasks move through a defined set of statuses. Each status represents a distinct phase of the task's existence, and only authorized parties can trigger transitions.

## Status Definitions

| Status    | Value | Description                                           |
|-----------|-------|-------------------------------------------------------|
| Open      | 0     | Task posted by agent, waiting for a worker to accept  |
| Accepted  | 1     | A worker has accepted and is executing the task       |
| Submitted | 2     | Worker has submitted proof of completion              |
| Completed | 3     | Agent approved the proof; funds released              |
| Disputed  | 4     | Agent disputed the submitted proof                   |
| Cancelled | 5     | Task cancelled before acceptance                     |
| Expired   | 6     | Task closed via claimExpired() after a deadline lapsed |

## State Transition Table

| From      | To        | Function                         | Caller                           |
|-----------|-----------|----------------------------------|----------------------------------|
| —         | Open      | `createTask()`                   | Agent (any wallet)               |
| Open      | Accepted  | `acceptTask(taskId)`             | Worker (any wallet except agent) |
| Open      | Cancelled | `cancelTask(taskId)`             | Agent                            |
| Accepted  | Submitted | `submitProof(taskId, proofURI)`  | Worker                           |
| Submitted | Completed | `approveTask(taskId)`            | Agent                            |
| Submitted | Disputed  | `disputeTask(taskId)`            | Agent                            |
| Disputed  | Completed | `resolveDispute(taskId, false)`  | Owner                            |
| Disputed  | Completed | `resolveDispute(taskId, true)`   | Owner                            |
| Open      | Expired   | `claimExpired(taskId)`           | Anyone                           |
| Accepted  | Expired   | `claimExpired(taskId)`           | Anyone                           |
| Submitted | Completed | `claimExpired(taskId)`           | Anyone                           |

Note: `claimExpired()` transitions Submitted tasks to Completed (auto-approval) rather than Expired, because funds flow to the worker in that case.

## Role Definitions

- **Agent**: The wallet address that called `createTask()`. On Celo, typically an autonomous AI program (Claude-based agent) with a funded USDC wallet.
- **Worker**: The wallet address that called `acceptTask()`. On Celo, a verified human using MiniPay/Valora with CIP-64 USDC gas abstraction.
- **Owner**: The contract owner (deployer or transferred address). Resolves disputes and manages contract configuration on Celo mainnet proxy `0xADA0466303441102cb16F8eC1594C744d603f746`.
- **Anyone**: Any EOA or contract. Permissionless callers for time-based expiry transitions.

## Terminal States

Completed, Cancelled, and Expired are terminal states. No further transitions are possible once a task reaches one of these statuses. Funds are fully disbursed or refunded before a task reaches a terminal state.

## Deadline Semantics

Each task carries two deadlines set at creation:

- `deadline`: The latest timestamp by which a worker must accept. After this, the task can be expired by anyone if still Open.
- `completionDeadline`: The latest timestamp by which the worker must submit proof after accepting. After this, the task can be expired by anyone if still Accepted.
