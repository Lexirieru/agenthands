// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title  IAgentHandsEvents
/// @notice Events emitted by the AgentHands marketplace contract.
/// @dev    Import this interface to subscribe to AgentHands events in external
///         contracts or to decode logs off-chain without the full ABI.
interface IAgentHandsEvents {
    /// @notice Emitted when a new task is created and reward is locked in escrow.
    /// @dev    Emitted at the end of `createTask`, after the ERC-20 transfer to escrow
    ///         has succeeded. Indexing `taskId` and `agent` allows efficient filtering
    ///         by task or by posting agent without a full event scan.
    /// @param taskId       Unique task identifier.
    /// @param agent        Address of the AI agent that posted the task.
    /// @param reward       Reward amount locked in the payment token.
    /// @param paymentToken ERC-20 token used for the reward.
    event TaskCreated(uint256 indexed taskId, address indexed agent, uint256 reward, address paymentToken);

    /// @notice Emitted when a human worker accepts an open task on Celo.
    /// @dev    After this event the task is locked to `worker` — no other address
    ///         can accept it. The task moves to `Accepted` status.
    /// @param taskId Task identifier.
    /// @param worker Address of the Celo wallet that accepted the task.
    event TaskAccepted(uint256 indexed taskId, address indexed worker);

    /// @notice Emitted when a worker submits an IPFS proof of task completion.
    /// @dev    The actual proof files live on IPFS (pinned via Pinata); only the
    ///         CID is stored on-chain. The task moves to `Submitted` status after
    ///         this event. `proofCID` is not indexed — retrieve it from the log data.
    /// @param taskId   Task identifier.
    /// @param proofCID IPFS content identifier of the uploaded completion proof.
    event ProofSubmitted(uint256 indexed taskId, string proofCID);

    /// @notice Emitted when a task is approved and payment released to the worker.
    /// @dev    `payout` is the gross reward (before fee deduction), not the net amount
    ///         the worker actually receives. The actual transfer to the worker equals
    ///         `payout - (payout * platformFeeBps / 10000)`. Off-chain indexers should
    ///         read `platformFeeBps` from the contract to reconstruct the exact net figure.
    /// @param taskId Task identifier.
    /// @param worker Worker who received the payout.
    /// @param payout Gross reward amount (net = payout minus platform fee).
    event TaskCompleted(uint256 indexed taskId, address indexed worker, uint256 payout);

    /// @notice Emitted when an agent disputes the submitted proof.
    /// @dev    Task moves to `Disputed`. After this event the owner must call
    ///         `resolveDispute` to settle the outcome. If the dispute is not resolved
    ///         and the agent does not react within 7 days of `completionDeadline`,
    ///         `claimExpired` can auto-approve the task for the worker on Celo.
    /// @param taskId Task identifier.
    /// @param agent  Celo wallet of the AI agent who raised the dispute.
    event TaskDisputed(uint256 indexed taskId, address indexed agent);

    /// @notice Emitted when an agent cancels an open task before any worker accepts.
    /// @dev    Full reward refunded to the agent at the time of this event; no fee deducted.
    ///         Task moves to `Cancelled`. Possible only while status is `Open` on Celo mainnet.
    /// @param taskId Task identifier.
    event TaskCancelled(uint256 indexed taskId);

    /// @notice Emitted when the owner resolves a disputed task via centralised arbitration.
    /// @dev    If `workerWins` is true, the reward minus platform fee is transferred to the
    ///         worker on Celo. If false, the full reward is refunded to the agent (no fee
    ///         on invalid disputes). Task moves to `Completed` or `Cancelled` accordingly.
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

    /// @notice Emitted when an expired task is refunded to the agent on Celo.
    /// @dev    Triggered by `claimExpired` for two cases:
    ///         1. `Open` task whose acceptance deadline passed — no worker accepted.
    ///         2. `Accepted` task whose completion deadline passed — worker never submitted proof.
    ///         In both cases the full `refund` amount (no fee) is returned to `agent`.
    ///         Anyone may call `claimExpired` — the caller receives no reward.
    /// @param taskId Task identifier.
    /// @param agent  Celo wallet of the agent who received the refund.
    /// @param refund Amount refunded in the task's payment token (USDC or CELO).
    event TaskExpired(uint256 indexed taskId, address indexed agent, uint256 refund);

    /// @notice Emitted when a submitted task is auto-approved after the 7-day review window.
    /// @dev    Triggered by `claimExpired` when a `Submitted` task's `completionDeadline + 7 days`
    ///         has elapsed without the agent calling `approveTask` or `disputeTask`.
    ///         Protects Celo workers from agents who deliberately delay review.
    ///         `payout` is the net amount after the platform fee.
    /// @param taskId Task identifier.
    /// @param worker Celo wallet of the worker who received the auto-payout.
    /// @param payout Net payout after platform fee (gross reward minus 2.5% on Celo mainnet).
    event TaskAutoCompleted(uint256 indexed taskId, address indexed worker, uint256 payout);
}
