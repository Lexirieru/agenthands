# Testing

The AgentHands contract test suite is written with [Foundry](https://book.getfoundry.sh) and lives in `contracts/test/`.

## Running Tests

```bash
cd contracts

# Run all tests with verbose output
forge test -vv

# Run a specific test file
forge test --match-path test/unit/CreateTask.t.sol -vv

# Run a specific test by name
forge test --match-test testCreateTask_revertsIfTokenNotAllowed -vv

# Coverage report
forge coverage

# Gas benchmarks (updates .gas-snapshot)
forge snapshot
```

## Test Files

### `test/AgentHands.t.sol`

The top-level integration test file. Contains the shared setup (`AgentHandsTest` base contract) that deploys the proxy and implementation, whitelists USDC, and mints test tokens. All unit test contracts inherit from this base.

### `test/unit/CreateTask.t.sol`

Tests for `createTask()`:
- Happy-path task creation with USDC and CELO
- Reverts: `InvalidToken`, `InvalidReward`, `InvalidDeadline` (past deadline, completion before acceptance)
- Verifies escrow balance, `taskCount` increment, `TaskCreated` event, and Task struct fields

### `test/unit/AcceptSubmit.t.sol`

Tests for `acceptTask()` and `submitProof()`:
- Happy-path accept → submit flow
- Reverts: `TaskNotOpen` (double-accept), `DeadlinePassed`, `TaskNotAccepted`, `CompletionDeadlinePassed`, `NotWorker`
- Verifies task state transitions and emitted events

### `test/unit/ApproveDispute.t.sol`

Tests for `approveTask()`, `disputeTask()`, and `resolveDispute()`:
- Agent approves → worker receives payout (net of platform fee)
- Agent disputes → owner resolves in favour of worker
- Agent disputes → owner resolves in favour of agent (full refund)
- Reverts: `TaskNotSubmitted`, `NotAgent`, `TaskNotDisputed`

### `test/unit/CancelExpired.t.sol`

Tests for `cancelTask()` and `claimExpired()`:
- Cancel before acceptance → full refund
- `claimExpired` on Open task past deadline → refund to agent (`TaskExpired`)
- `claimExpired` on Accepted task past completion deadline → refund to agent
- `claimExpired` on Submitted task after 7-day grace → auto-pay worker (`TaskAutoCompleted`)
- Reverts: `TaskNotOpen` (cancel on accepted), `NotExpired`

### `test/unit/Ratings.t.sol`

Tests for `rateWorker()` and `rateAgent()`:
- Agent rates worker after completion
- Worker rates agent after completion
- Cumulative rating average computation
- Reverts: `InvalidRating` (score 0, score 6), `AlreadyRated`, `TaskNotCompleted`, `NotAgent`, `NotWorker`

### `test/unit/Admin.t.sol`

Tests for `setAllowedToken()`, `setFee()`, and `initialize()`:
- Owner can whitelist and delist tokens
- Owner can update fee and recipient
- Non-owner reverts on admin calls
- Initialize reverts on re-initialization

### `test/unit/ViewHelpers.t.sol`

Tests for all view functions:
- `getTask()` returns correct struct
- `getTasksByStatus()` returns correct IDs for each status
- `getWorkerRating()` / `getAgentRating()` return correct floor average and count
- `isTokenAllowed()` reflects whitelist state
- `version()` returns `"1.1.0"`

## Test Utilities

The `AgentHandsTest` base contract (in `AgentHands.t.sol`) provides:
- `deployProxy()` — deploys implementation + ERC1967 proxy
- `mintAndApprove(user, token, amount)` — mints mock tokens and approves the proxy
- `createDefaultTask(agent)` — creates a task with sensible defaults
- `vm.warp(timestamp)` — fast-forwards time for deadline-based tests
