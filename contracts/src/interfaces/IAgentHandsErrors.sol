// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title  IAgentHandsErrors
/// @notice Custom errors used by the AgentHands marketplace contract.
/// @dev    Importing this interface allows external contracts and off-chain tooling
///         to decode AgentHands reverts without depending on the full implementation.
interface IAgentHandsErrors {
    /// @notice Thrown when the payment token is not on the whitelist.
    /// @dev    Reverts in `createTask` when `allowedTokens[_paymentToken]` is false.
    error InvalidToken();

    /// @notice Thrown when the reward amount is zero.
    /// @dev    Reverts in `createTask` when `_reward == 0`.
    error InvalidReward();

    /// @notice Thrown when a deadline is in the past or logically inconsistent.
    /// @dev    Reverts in `createTask` when `_deadline <= block.timestamp` or
    ///         `_completionDeadline <= _deadline`.
    error InvalidDeadline();

    /// @notice Thrown when an action requires TaskStatus.Open but the task is not open.
    /// @dev    Reverts in `acceptTask` and `cancelTask`.
    error TaskNotOpen();

    /// @notice Thrown when an action requires TaskStatus.Accepted but the task is not accepted.
    /// @dev    Reverts in `submitProof` when the task is still Open (no worker has accepted
    ///         it yet on Celo). A worker must call `acceptTask` first, which also sets the
    ///         `worker` field and moves status from Open → Accepted.
    error TaskNotAccepted();

    /// @notice Thrown when an action requires TaskStatus.Submitted but proof has not been submitted.
    /// @dev    Reverts in `approveTask` and `disputeTask`. The worker must first call
    ///         `submitProof(taskId, cid)` with a Pinata IPFS CID before the agent can
    ///         approve or dispute on Celo. Without proof, the 7-day auto-approve grace
    ///         period in `claimExpired` cannot reach the Submitted state either.
    error TaskNotSubmitted();

    /// @notice Thrown when resolving a dispute on a task that is not in Disputed status.
    /// @dev    Reverts in `resolveDispute`. The agent must have called `disputeTask` first
    ///         to move the task to Disputed status on Celo before the contract owner (or a
    ///         future Kleros arbitrator integration) can call `resolveDispute(taskId, workerWins)`.
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
    error DeadlinePassed();

    /// @notice Thrown when the completion deadline has already passed.
    /// @dev    Reverts in `submitProof` when `block.timestamp > task.completionDeadline`.
    error CompletionDeadlinePassed();

    /// @notice Thrown when a rating score is outside the 1–5 range.
    /// @dev    Reverts in `rateWorker` and `rateAgent` when `_score < 1 || _score > 5`.
    error InvalidRating();

    /// @notice Thrown when attempting to rate a task that has already been rated by the same party.
    /// @dev    Reverts in `rateWorker` (if `workerRatedForTask[_taskId]`) or
    ///         `rateAgent` (if `agentRatedForTask[_taskId]`).
    error AlreadyRated();

    /// @notice Thrown when rating is attempted on a task that is not yet completed.
    /// @dev    Reverts in `rateWorker` and `rateAgent` when status != Completed.
    error TaskNotCompleted();

    /// @notice Thrown when `claimExpired` is called on a task that has not yet expired.
    /// @dev    None of the three expiry paths (Open+deadline, Accepted+completionDeadline,
    ///         Submitted+completionDeadline+7days) were satisfied.
    error NotExpired();
}
