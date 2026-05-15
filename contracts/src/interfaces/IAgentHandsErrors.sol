// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title  IAgentHandsErrors
/// @notice Custom errors used by the AgentHands marketplace contract.
/// @dev    Importing this interface allows external contracts and off-chain tooling
///         to decode AgentHands reverts without depending on the full implementation.
interface IAgentHandsErrors {
    /// @notice Thrown when the payment token is not on the whitelist.
    error InvalidToken();

    /// @notice Thrown when the reward amount is zero.
    error InvalidReward();

    /// @notice Thrown when a deadline is in the past or logically inconsistent.
    error InvalidDeadline();

    /// @notice Thrown when an action requires TaskStatus.Open but the task is not open.
    error TaskNotOpen();

    /// @notice Thrown when an action requires TaskStatus.Accepted but the task is not accepted.
    error TaskNotAccepted();

    /// @notice Thrown when an action requires TaskStatus.Submitted but proof has not been submitted.
    error TaskNotSubmitted();

    /// @notice Thrown when resolving a dispute on a task that is not in Disputed status.
    error TaskNotDisputed();

    /// @notice Thrown when the caller is not the agent who posted the task.
    error NotAgent();

    /// @notice Thrown when the caller is not the worker assigned to the task.
    error NotWorker();

    /// @notice Thrown when the acceptance deadline has already passed.
    error DeadlinePassed();

    /// @notice Thrown when the completion deadline has already passed.
    error CompletionDeadlinePassed();

    /// @notice Thrown when a rating score is outside the 1–5 range.
    error InvalidRating();

    /// @notice Thrown when attempting to rate a task that has already been rated.
    error AlreadyRated();

    /// @notice Thrown when rating is attempted on a task that is not yet completed.
    error TaskNotCompleted();

    /// @notice Thrown when claimExpired is called on a task that has not expired.
    error NotExpired();
}
