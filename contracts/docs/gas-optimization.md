# Gas Optimization

This document covers the gas profile of AgentHands operations and the design decisions made to minimize on-chain costs.

## Estimated Gas Per Operation

These estimates are based on Foundry test measurements on a local fork. Actual costs on Celo mainnet may vary by a few percent depending on state and calldata size.

| Function                        | Estimated Gas   | Notes                                              |
|---------------------------------|-----------------|----------------------------------------------------|
| `createTask()`                  | ~180,000        | Includes ERC20 transferFrom and Task struct write  |
| `acceptTask()`                  | ~50,000         | Single storage update + event                      |
| `submitProof()`                 | ~60,000         | Stores proof URI string + status update            |
| `approveTask()`                 | ~80,000         | Two ERC20 transfers (worker + fee) + status update |
| `cancelTask()`                  | ~55,000         | One ERC20 transfer + status update                 |
| `disputeTask()`                 | ~35,000         | Status update + event only                         |
| `resolveDispute()`              | ~80,000         | Same as approveTask for fund release path          |
| `claimExpired()`                | ~60,000–80,000  | Depends on which case is triggered                 |
| `rateWorker()` / `rateAgent()`  | ~45,000         | Two storage writes (total, count)                  |

Celo's gas price is typically 0.1-5 gwei. At 1 gwei, a `createTask()` costs approximately 0.00018 CELO.

## Task Struct Packing

The `Task` struct is designed to minimize storage slot usage. Solidity packs contiguous values that fit into a single 32-byte slot. Fields are ordered so small types (`uint8`, `bool`) are grouped after large types to take advantage of packing:

```
slot 0: agent (address 20 bytes) + status (uint8 1 byte) — packed
slot 1: worker (address)
slot 2: token (address)
slot 3: reward (uint256)
slot 4: deadline (uint64) + completionDeadline (uint64) — packed
slot 5: proofURI (string, dynamic — pointer + length)
```

Reordering struct fields carelessly would break both packing efficiency and the upgrade storage layout guarantee.

## nonReentrant Overhead

The `nonReentrant` guard costs approximately 2,300 gas per call on a cold storage slot (first call) and ~300 gas on a warm slot (subsequent calls in the same transaction). This overhead is considered acceptable given the security guarantee it provides.

## Calldata Strings

`createTask()` accepts `title`, `description`, and `location` as `calldata string` parameters rather than `memory`. This avoids copying the strings into memory and reduces gas for larger inputs. The strings are not stored in contract storage — only the proof URI submitted by the worker is persisted on-chain.

## Batch Operation Strategy

AgentHands does not implement batching internally. If an AI agent needs to create multiple tasks atomically, use a multicall wrapper:

1. Approve the total token amount for the proxy in one transaction.
2. Use a Multicall3 contract (deployed universally at `0xcA11bde05977b3631167028862bE2a173976CA11`) to batch all `createTask()` calls in a single transaction.

This reduces the fixed-cost overhead (base fee, event indexing, nonce increment) across multiple operations.
