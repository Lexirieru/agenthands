# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Foundry package for `AgentHands.sol` — a UUPS-upgradeable escrow marketplace on Celo mainnet. Solidity 0.8.24, OpenZeppelin v5. See the repo-root `CLAUDE.md` for how this fits with `backend/` and `frontend/`.

## Mainnet safety — read first

Proxy `0xADA0466303441102cb16F8eC1594C744d603f746` is **live on Celo mainnet holding real escrowed USDC.**

**Do not run `make deploy`, `make upgrade`, `make set-fee`, `make set-token`, or any `forge script --broadcast`** unless the user explicitly requests that exact command in that message. Approval for one broadcast never carries to the next. Reading (`make get-task`, `forge script` without `--broadcast`) is fine.

## Commands

```bash
forge test -vv                                  # full suite, ~84 tests across 8 files
forge test --match-test test_CreateTask -vvv    # one test
forge test --match-contract RatingsTest         # one contract
forge test --match-path test/unit/Ratings.t.sol # one file
forge test --gas-report                         # == make test-gas

forge build --sizes                             # CI runs this
forge fmt --check                               # CI runs this; forge fmt to fix
```

`via_ir = true` (`foundry.toml`), so compiles are slow and `forge coverage` generally needs `--ir-minimum`. `forge fmt` enforces `line_length=100`, `tab_width=4`, and `int_types="long"` — write `uint256`, never `uint`.

The `Makefile` passes `--legacy` (type-0 transactions) on every broadcasting target because of Celo. The root `README.md`'s deploy snippet omits `--legacy` and adds `--slow --verify`; the two documented paths differ. Prefer the Makefile.

## The state machine

`TaskStatus` (`AgentHands.sol:41`) — numeric values are ABI-stable and mirrored by hand in the frontend and in `interfaces/IAgentHands.sol`. **Never reorder.**

`0 Open · 1 Accepted · 2 Submitted · 3 Completed · 4 Disputed · 5 Cancelled · 6 Expired`

| Function | Transition | Authorized | Guards |
|---|---|---|---|
| `createTask` | → Open | anyone (becomes `agent`) | `nonReentrant` |
| `acceptTask` | Open → Accepted | anyone (becomes `worker`) | reverts `DeadlinePassed` |
| `submitProof` | Accepted → Submitted | `onlyWorker` | reverts `CompletionDeadlinePassed` |
| `approveTask` | Submitted → Completed | `onlyAgent` | `nonReentrant`, pays worker |
| `disputeTask` | Submitted → Disputed | `onlyAgent` | no transfer |
| `resolveDispute(id, workerWins)` | Disputed → Completed \| Cancelled | `onlyOwner` | `nonReentrant` |
| `cancelTask` | Open → Cancelled | `onlyAgent` | `nonReentrant`, full refund |
| `claimExpired` | see below | **anyone** | `nonReentrant` |

Completed, Cancelled, and Expired are terminal. No transition ever moves backwards.

`claimExpired` (`AgentHands.sol:613`) has three ordered branches, else `revert NotExpired`:

- **Open past `deadline`** → Expired, full refund to agent.
- **Accepted past `completionDeadline`** → Expired, full refund to agent.
- **Submitted past `completionDeadline + 7 days`** → Completed, `_releaseFunds` pays the **worker**. The hardcoded 7-day grace protects workers from an agent who never reviews.

Owner-only surface: `setAllowedToken`, `setFee`, `resolveDispute`, `_authorizeUpgrade`.

## Storage layout — the upgrade landmine

There is **no `__gap`** in `AgentHands.sol`.

Line 9 imports the **non-upgradeable** `ReentrancyGuard` (`@openzeppelin/contracts/utils/ReentrancyGuard.sol`), not `ReentrancyGuardUpgradeable`. That base declares a real sequential storage variable `_status`, which lands at **slot 0**, ahead of `taskCount`. The three upgradeable parents (`Initializable`, `UUPSUpgradeable`, `OwnableUpgradeable`) use ERC-7201 namespaced storage and consume no sequential slots.

Consequences for any upgrade:

- **Append new variables only.** Never remove or reorder existing ones.
- **Do not "fix" the base to `ReentrancyGuardUpgradeable`, and do not change inheritance order.** Either would move or drop the slot-0 `_status` and shift the entire layout, corrupting live proxy state.
- Run `forge inspect AgentHands storageLayout` and diff it against the deployed implementation before proposing any upgrade. `docs/upgrade-guide.md` also covers this — but note it references a `script/DeployImpl.s.sol` and a `NEW_IMPL` env var that **do not exist**; the real `Upgrade.s.sol` deploys the implementation itself.

## Fee math

`_releaseFunds` (`AgentHands.sol:782`), the only place the split happens:

```
fee    = reward * platformFeeBps / 10_000   // integer floor division
payout = reward - fee                        // rounding dust goes to the worker
```

The fee transfer is skipped entirely when `fee == 0`. Mainnet is 250 bps (2.5%). `setFee` has no on-chain cap and no zero-address check — intentional, per its NatSpec. `_releaseFunds` is reached from `approveTask`, `resolveDispute` (worker wins), and the `claimExpired` auto-complete branch. Cancel, expiry refund, and agent-wins dispute pay **no** fee.

## Ratings

Cumulative `total`/`count` pairs per address, plus per-task `workerRatedForTask` / `agentRatedForTask` booleans. `rateWorker` is `onlyAgent`, `rateAgent` is `onlyWorker`. Both require score `1..5`, task status `Completed`, and not-yet-rated. Immutable once set. `getWorkerRating` / `getAgentRating` return integer floor averages and `(0,0)` when unrated.

Because only `Completed` tasks are rateable, Cancelled and Expired tasks can never be rated — but a task auto-completed by `claimExpired` can.

## Errors and events are declared twice

`AgentHands.sol` declares 14 custom errors (`:199`) and 13 events (`:116`) **inline**, and `interfaces/IAgentHandsErrors.sol` / `interfaces/IAgentHandsEvents.sol` declare the same set again. `AgentHands` does **not** inherit those interfaces — they are a parallel copy for off-chain integrators. Signatures currently match, so ABIs align. **Any change must be applied to both**, or they drift.

One drift already exists: the inline NatSpec on `TaskCompleted` (`:141`) and `TaskAutoCompleted` (`:189`) describes `payout` as net-after-fee, but the code emits gross `task.reward` (`:517`, `:633`). `IAgentHandsEvents.sol` and `approveTask`'s own `@dev` block both document it correctly as gross.

## Test conventions

Eight files, ~84 tests. **No shared base contract** — every test contract is `is Test` and copy-pastes an identical `setUp()`: deploy `MockERC20("USD Coin","USDC",6)` → deploy implementation → `ERC1967Proxy` with `initialize(feeRecipient, 250)` → `setAllowedToken` → `usdc.mint(agent, 1000e6)`. Each file also defines its own local `_createTask` helper. Follow that pattern rather than inventing a base class.

**Two naming styles coexist.** Match whichever file you are editing:

- `test/AgentHands.t.sol` — `test_CreateTask`, `test_RevertCreateTask_InvalidToken`
- `test/unit/*.t.sol` — `test_createTask_succeeds`, `test_acceptTask_revertsIfDeadlinePassed`

`test/AgentHands.t.sol` is a full-lifecycle integration suite that genuinely duplicates coverage in `test/unit/*` (create, accept, submit, approve, cancel, dispute, ratings, all three `claimExpired` paths, upgrade auth). It is not a base class.

Cheatcodes in use: `vm.prank` / `startPrank` / `stopPrank`, `vm.warp`, `vm.expectRevert`, `vm.expectEmit`. There is **no `vm.deal`** — funding is `MockERC20.mint`, not native ETH. There are **zero fuzz tests, zero invariant tests**, and no `.gas-snapshot` is committed, so CI's `forge snapshot --check` has no baseline (and is `continue-on-error` anyway).

## Scripts and their env vars

| Script | Reads | Does |
|---|---|---|
| `Deploy.s.sol` | `PRIVATE_KEY`, `USDC_ADDRESS` | impl → `ERC1967Proxy` → `initialize(deployer, 250)` → whitelist USDC |
| `Upgrade.s.sol` | `PRIVATE_KEY`, `PROXY_ADDRESS` | deploys new impl, then `upgradeToAndCall(impl, "")` |
| `SetAllowedToken.s.sol` | `PRIVATE_KEY`, `PROXY_ADDRESS`, `TOKEN_ADDRESS`, `TOKEN_ALLOWED` | token whitelist |
| `SetFee.s.sol` | `PRIVATE_KEY`, `PROXY_ADDRESS`, `FEE_BPS`, `FEE_RECIPIENT` | fee update |
| `GetTask.s.sol` | `PROXY_ADDRESS`, `TASK_ID` | read-only, no broadcast |

## NatSpec is required

Every contract, enum, struct, event, error, and function carries `///` NatSpec: `@notice` for the user-facing statement, `@dev` for mechanism, `@param` for every argument. `@dev` blocks are expected to explain Celo / MiniPay / x402 / CIP-64 rationale and to spell out arithmetic with a worked USDC example — see `approveTask` (`:492`) as the reference. Match that density; do not ship a bare `@notice`.

## Traps

- **`contracts/.github/workflows/test.yml` never runs.** Actions only reads the repo-root `.github/`. The live workflows are `.github/workflows/contracts-{test,lint}.yml`, path-filtered to `contracts/**` on `main`. They use the default profile, so `[profile.ci]` and its `fuzz.runs = 256` are dead config.
- The comment in `foundry.toml` says `forge lint --check` is enforced in CI. It isn't — CI runs `forge fmt --check`.
- **`.env.example` is wrong.** It defines `USDC_MAINNET=0x765DE816845861e75A25fCA122bb6898B8B1282a`, which is Mento cUSD/USDm — *not* USDC (`0xcebA9300f2b948710d2653dD7B07f33A8B32118C`). And `Deploy.s.sol` reads `USDC_ADDRESS`, which the example never defines. Copying it verbatim either fails or whitelists the wrong token.
- **`docs/testing.md` is fiction** where it describes a shared base contract and `deployProxy()` / `mintAndApprove()` / `createDefaultTask()` helpers.
- **`docs/upgrade-guide.md`** references `script/DeployImpl.s.sol` and `NEW_IMPL`, neither of which exists.
- `broadcast/` contains artifacts for chains `84532` (Base Sepolia) and `11142220` alongside `42220`, despite the docs describing Celo mainnet exclusively.
- `getTasksByStatus` is an O(n) two-pass scan over every task. It is a view, but it degrades as `taskCount` grows.
