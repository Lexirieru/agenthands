// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title  IAgentHandsEvents
/// @notice Events emitted by the AgentHands marketplace contract.
/// @dev    Import this interface to subscribe to AgentHands events in external
///         contracts or to decode logs off-chain without the full ABI.
interface IAgentHandsEvents {
    /// @notice Emitted when a new task is created and reward is locked in escrow.
    /// @param taskId       Unique task identifier.
    /// @param agent        Address of the AI agent that posted the task.
    /// @param reward       Reward amount locked in the payment token.
    /// @param paymentToken ERC-20 token used for the reward.
    event TaskCreated(uint256 indexed taskId, address indexed agent, uint256 reward, address paymentToken);

    /// @notice Emitted when a worker accepts an open task.
    /// @param taskId Task identifier.
    /// @param worker Address of the worker who accepted.
    event TaskAccepted(uint256 indexed taskId, address indexed worker);

    /// @notice Emitted when a worker submits proof of task completion.
    /// @param taskId   Task identifier.
    /// @param proofCID IPFS content identifier of the uploaded proof.
    event ProofSubmitted(uint256 indexed taskId, string proofCID);

    /// @notice Emitted when a task is approved and payment released to the worker.
    /// @param taskId Task identifier.
    /// @param worker Worker who received the payout.
    /// @param payout Net amount paid after platform fee deduction.
    event TaskCompleted(uint256 indexed taskId, address indexed worker, uint256 payout);

    /// @notice Emitted when an agent disputes the submitted proof.
    /// @param taskId Task identifier.
    /// @param agent  Agent who raised the dispute.
    event TaskDisputed(uint256 indexed taskId, address indexed agent);

    /// @notice Emitted when an agent cancels an open task.
    /// @param taskId Task identifier.
    event TaskCancelled(uint256 indexed taskId);

    /// @notice Emitted when the owner resolves a disputed task.
    /// @param taskId      Task identifier.
    /// @param workerWins  True if reward sent to worker; false if refunded to agent.
    event DisputeResolved(uint256 indexed taskId, bool workerWins);

    /// @notice Emitted when an agent rates the worker after completion.
    /// @param taskId Task identifier.
    /// @param worker Worker being rated.
    /// @param score  Score between 1 and 5.
    event WorkerRated(uint256 indexed taskId, address indexed worker, uint8 score);

    /// @notice Emitted when a worker rates the agent after completion.
    /// @param taskId Task identifier.
    /// @param agent  Agent being rated.
    /// @param score  Score between 1 and 5.
    event AgentRated(uint256 indexed taskId, address indexed agent, uint8 score);

    /// @notice Emitted when a token's whitelist status is updated.
    /// @param token   ERC-20 token address.
    /// @param allowed True if now allowed; false if removed.
    event TokenAllowed(address token, bool allowed);

    /// @notice Emitted when an expired task is refunded to the agent.
    /// @param taskId Task identifier.
    /// @param agent  Agent who received the refund.
    /// @param refund Amount refunded.
    event TaskExpired(uint256 indexed taskId, address indexed agent, uint256 refund);

    /// @notice Emitted when a submitted task is auto-approved after the review window expires.
    /// @param taskId Task identifier.
    /// @param worker Worker who received the auto-payout.
    /// @param payout Net payout after fees.
    event TaskAutoCompleted(uint256 indexed taskId, address indexed worker, uint256 payout);
}
