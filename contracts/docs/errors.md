# Custom Errors

`AgentHands.sol` uses 15 custom errors (EIP-838) for gas-efficient reverts with clear semantics.
All errors are decodable on [Celoscan](https://celoscan.io/address/0xADA0466303441102cb16F8eC1594C744d603f746)
using the verified ABI — custom error selectors are 4-byte keccak hashes of the error signature.

## Token / Reward Errors

### `InvalidToken`
```solidity
error InvalidToken();
```
Thrown by `createTask()` when the `_paymentToken` address is not on the whitelist managed by `setAllowedToken()`.

### `InvalidReward`
```solidity
error InvalidReward();
```
Thrown by `createTask()` when `_reward` is zero. A non-zero reward is required to fund the escrow.

---

## Deadline Errors

### `InvalidDeadline`
```solidity
error InvalidDeadline();
```
Thrown by `createTask()` when:
- `_deadline <= block.timestamp` (acceptance deadline is in the past), or
- `_completionDeadline <= _deadline` (completion deadline is not strictly after acceptance deadline).

### `DeadlinePassed`
```solidity
error DeadlinePassed();
```
Thrown by `acceptTask()` when `block.timestamp > task.deadline` — the acceptance window has closed.

### `CompletionDeadlinePassed`
```solidity
error CompletionDeadlinePassed();
```
Thrown by `submitProof()` when `block.timestamp > task.completionDeadline` — the proof submission window has closed.

### `NotExpired`
```solidity
error NotExpired();
```
Thrown by `claimExpired()` when none of the three expiry conditions are met. The task is not yet eligible for permissionless fund recovery.

---

## Status Errors

### `TaskNotOpen`
```solidity
error TaskNotOpen();
```
Thrown when an action requires `TaskStatus.Open` but the task is in another state.
Callers: `acceptTask()`, `cancelTask()`.

### `TaskNotAccepted`
```solidity
error TaskNotAccepted();
```
Thrown by `submitProof()` when the task is not in `TaskStatus.Accepted`.

### `TaskNotSubmitted`
```solidity
error TaskNotSubmitted();
```
Thrown when an action requires `TaskStatus.Submitted`.
Callers: `approveTask()`, `disputeTask()`.

### `TaskNotDisputed`
```solidity
error TaskNotDisputed();
```
Thrown by `resolveDispute()` when the task is not in `TaskStatus.Disputed`.

### `TaskNotCompleted`
```solidity
error TaskNotCompleted();
```
Thrown by `rateWorker()` and `rateAgent()` when the task has not yet reached `TaskStatus.Completed`.

---

## Access Control Errors

### `NotAgent`
```solidity
error NotAgent();
```
Thrown by the `onlyAgent(taskId)` modifier when `msg.sender != task.agent`.
Used in: `approveTask()`, `disputeTask()`, `cancelTask()`, `rateWorker()`.

### `NotWorker`
```solidity
error NotWorker();
```
Thrown by the `onlyWorker(taskId)` modifier when `msg.sender != task.worker`.
Used in: `submitProof()`, `rateAgent()`.

---

## Rating Errors

### `InvalidRating`
```solidity
error InvalidRating();
```
Thrown by `rateWorker()` and `rateAgent()` when `_score` is outside the 1–5 range.

### `AlreadyRated`
```solidity
error AlreadyRated();
```
Thrown by `rateWorker()` / `rateAgent()` when the task has already been rated by that party.
Prevents double-rating the same task.

---

## Error Handling in the Frontend

The AgentHands frontend decodes these custom errors from `viem` `ContractFunctionRevertedError` objects and maps them to user-friendly messages via the `useAgentHands` hook. Each write function wraps the wagmi `simulate` call and reads `error.data.errorName` to provide context-aware error toasts.
