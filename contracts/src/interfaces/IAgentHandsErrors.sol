// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title  IAgentHandsErrors
/// @notice Custom errors used by the AgentHands marketplace contract.
/// @dev    Importing this interface allows external contracts and off-chain tooling
///         to decode AgentHands reverts without depending on the full implementation.
interface IAgentHandsErrors {
    /// @notice Thrown when the payment token is not on the whitelist.
    /// @dev    Reverts in `createTask` when `allowedTokens[_paymentToken]` is false.
    ///         On Celo mainnet only USDC (`0xcebA9300f2b948710d2653dD7B07f33A8B32118C`) and
    ///         CELO ERC-20 (`0x471EcE3750Da237f93B8E339c536989b8978a438`) are whitelisted.
    error InvalidToken();

    /// @notice Thrown when the reward amount is zero.
    /// @dev    Reverts in `createTask` when `_reward == 0`. On Celo the minimum
    ///         meaningful reward is 1 wei of the payment token (e.g. 1 micro-USDC = $0.000001).
    ///         A zero reward would lock no funds in escrow, making the task unclaimable.
    error InvalidReward();

    /// @notice Thrown when a deadline is in the past or logically inconsistent.
    /// @dev    Reverts in `createTask` when `_deadline <= block.timestamp` or
    ///         `_completionDeadline <= _deadline`. On Celo (5-second block time),
    ///         even a 1-block future deadline is technically valid — in practice
    ///         use at least `block.timestamp + 1 hours` as a sensible minimum.
    error InvalidDeadline();

    /// @notice Thrown when an action requires TaskStatus.Open but the task is not open.
    /// @dev    Reverts in `acceptTask` and `cancelTask`. Common cause on Celo: a second
    ///         worker attempts to accept a task that was already accepted by another wallet.
    error TaskNotOpen();

    /// @notice Thrown when an action requires TaskStatus.Accepted but the task is not accepted.
    /// @dev    Reverts in `submitProof`.
    error TaskNotAccepted();

    /// @notice Thrown when an action requires TaskStatus.Submitted but proof has not been submitted.
    /// @dev    Reverts in `approveTask` and `disputeTask`.
    error TaskNotSubmitted();

    /// @notice Thrown when resolving a dispute on a task that is not in Disputed status.
    /// @dev    Reverts in `resolveDispute`.
    error TaskNotDisputed();

    /// @notice Thrown when the caller is not the agent who posted the task.
    /// @dev    Enforced by the `onlyAgent` modifier used in `approveTask`, `disputeTask`,
    ///         `cancelTask`, and `rateWorker`.
    error NotAgent();

    /// @notice Thrown when the caller is not the worker assigned to the task.
    /// @dev    Enforced by the `onlyWorker` modifier used in `submitProof` and `rateAgent`.
    error NotWorker();

    /// @notice Thrown when the acceptance deadline has already passed.
    /// @dev    Reverts in `acceptTask` when `block.timestamp > task.deadline`.
    ///         On Celo mainnet with ~5-second blocks, tasks with short deadlines
    ///         can expire within seconds of creation — the frontend filters these out
    ///         before showing them to workers in the swipe stack.
    error DeadlinePassed();

    /// @notice Thrown when the completion deadline has already passed.
    /// @dev    Reverts in `submitProof` when `block.timestamp > task.completionDeadline`.
    error CompletionDeadlinePassed();

    /// @notice Thrown when a rating score is outside the 1–5 range.
    /// @dev    Reverts in `rateWorker` and `rateAgent` when `_score < 1 || _score > 5`.
    error InvalidRating();

    /// @notice Thrown when attempting to rate a task that has already been rated by the same party.
    /// @dev    Reverts in `rateWorker` (if `workerRatedForTask[_taskId]`) or
    ///         `rateAgent` (if `agentRatedForTask[_taskId]`). Ratings on Celo are permanent
    ///         and immutable — there is no update or delete path. This prevents reputation
    ///         manipulation by re-submitting a higher score after a negative review.
    error AlreadyRated();

    /// @notice Thrown when rating is attempted on a task that is not yet completed.
    /// @dev    Reverts in `rateWorker` and `rateAgent` when status != Completed.
    error TaskNotCompleted();

    /// @notice Thrown when `claimExpired` is called on a task that has not yet expired.
    /// @dev    None of the three expiry paths (Open+deadline, Accepted+completionDeadline,
    ///         Submitted+completionDeadline+7days) were satisfied.
    error NotExpired();
}
