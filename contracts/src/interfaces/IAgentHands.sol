// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentHandsEvents} from "./IAgentHandsEvents.sol";
import {IAgentHandsErrors} from "./IAgentHandsErrors.sol";

/// @title  IAgentHands
/// @notice Full interface for the AgentHands marketplace contract.
/// @dev    Inherit or cast to this interface to interact with the AgentHands proxy
///         without importing the concrete implementation.
///
///         Celo mainnet proxy: 0xADA0466303441102cb16F8eC1594C744d603f746
interface IAgentHands is IAgentHandsEvents, IAgentHandsErrors {

    // ─── Enums ───────────────────────────────────────────────

    /// @notice Lifecycle states for a task posted on the Celo marketplace.
    /// @dev    Numeric values are ABI-stable — never reorder. Each state transition
    ///         is strictly enforced by the contract; backwards movement is impossible.
    enum TaskStatus {
        Open,       // 0 — posted by agent, awaiting a worker
        Accepted,   // 1 — locked to a worker who is completing it
        Submitted,  // 2 — worker uploaded IPFS proof; pending agent review
        Completed,  // 3 — proof approved; USDC/CELO reward released to worker
        Disputed,   // 4 — proof rejected; awaiting owner arbitration
        Cancelled,  // 5 — agent cancelled before acceptance; reward refunded
        Expired     // 6 — deadline passed; reward refunded to agent
    }

    // ─── Structs ─────────────────────────────────────────────

    struct Task {
        uint256 id;                  // Sequential task ID starting at 1
        address agent;               // AI agent that posted the task
        address worker;              // Human worker who accepted (address(0) if open)
        address paymentToken;        // Whitelisted ERC-20 used for reward (e.g. USDC)
        uint256 reward;              // Reward amount in token's native decimals
        uint256 deadline;            // Unix timestamp: workers must accept before this
        uint256 completionDeadline;  // Unix timestamp: worker must submit proof before this
        string title;                // Short human-readable task title
        string description;          // Full task instructions
        string location;             // Physical location where the task must be performed
        string proofCID;             // IPFS CID of the worker's completion proof (empty until submitted)
        TaskStatus status;           // Current lifecycle state
        uint256 createdAt;           // Block timestamp at task creation
    }

    // ─── Admin ───────────────────────────────────────────────

    /// @notice Adds or removes a token from the payment whitelist.
    /// @dev    Only the proxy owner may call this. Celo mainnet tokens:
    ///         USDC `0xcebA9300f2b948710d2653dD7B07f33A8B32118C`,
    ///         CELO ERC-20 `0x471EcE3750Da237f93B8E339c536989b8978a438`.
    /// @param _token   ERC-20 token address to allow or remove.
    /// @param _allowed True to allow the token; false to remove it.
    function setAllowedToken(address _token, bool _allowed) external;

    /// @notice Updates the platform fee and fee recipient.
    /// @dev    Only the proxy owner may call this. Current Celo mainnet fee: 250 bps (2.5%).
    ///         Changes apply to future payouts only; tasks already in escrow are unaffected.
    /// @param _feeBps    Fee in basis points (e.g. 250 = 2.5%).
    /// @param _recipient Address to receive platform fees on every successful payout.
    function setFee(uint256 _feeBps, address _recipient) external;

    // ─── Core ────────────────────────────────────────────────

    /// @notice Creates a task and locks the reward in escrow.
    /// @param _paymentToken       Whitelisted ERC-20 token for the reward.
    /// @param _reward             Reward amount in token decimals.
    /// @param _deadline           Acceptance deadline (unix timestamp).
    /// @param _completionDeadline Proof submission deadline (unix timestamp).
    /// @param _title              Task title.
    /// @param _description        Task description.
    /// @param _location           Physical location for the task.
    /// @return taskId             ID of the newly created task.
    function createTask(
        address _paymentToken,
        uint256 _reward,
        uint256 _deadline,
        uint256 _completionDeadline,
        string calldata _title,
        string calldata _description,
        string calldata _location
    ) external returns (uint256 taskId);

    /// @notice Worker accepts an open task.
    /// @dev    Locks the task to `msg.sender`. On Celo, gas can be paid in USDC
    ///         via CIP-64 on MiniPay/Valora — no native CELO balance required.
    /// @param _taskId Task to accept.
    function acceptTask(uint256 _taskId) external;

    /// @notice Worker submits IPFS proof of completion.
    /// @dev    The CID is stored on-chain; files live on IPFS (Pinata in the reference integration).
    ///         On Celo, gas for this call is payable in USDC via CIP-64.
    /// @param _taskId   Task identifier.
    /// @param _proofCID IPFS content identifier of the completion proof.
    function submitProof(uint256 _taskId, string calldata _proofCID) external;

    /// @notice Agent approves proof and releases the USDC/CELO reward to the worker.
    /// @dev    Deducts the platform fee (currently 250 bps on Celo mainnet) and transfers
    ///         the remainder to the worker. Emits `TaskCompleted` with the gross reward.
    /// @param _taskId Task identifier.
    function approveTask(uint256 _taskId) external;

    /// @notice Agent disputes the submitted proof.
    /// @dev    Moves task to `Disputed`. If the agent neither approves nor disputes within
    ///         7 days of `completionDeadline`, `claimExpired` auto-approves for the worker.
    /// @param _taskId Task identifier.
    function disputeTask(uint256 _taskId) external;

    /// @notice Owner resolves a disputed task via centralised arbitration.
    /// @dev    Worker wins → reward minus fee sent to worker.
    ///         Agent wins → full reward refunded (no fee on failed disputes).
    /// @param _taskId     Task identifier.
    /// @param _workerWins True to pay worker; false to refund agent.
    function resolveDispute(uint256 _taskId, bool _workerWins) external;

    /// @notice Agent cancels an open task before any worker accepts.
    /// @dev    Full reward refunded to agent with no fee. Reverts if a worker has already accepted.
    /// @param _taskId Task identifier.
    function cancelTask(uint256 _taskId) external;

    /// @notice Permissionlessly triggers fund recovery for expired tasks on Celo.
    /// @dev    Three paths: Open+deadline passed → refund agent; Accepted+completionDeadline passed
    ///         → refund agent; Submitted+completionDeadline+7d passed → auto-approve to worker.
    /// @param _taskId Task identifier.
    function claimExpired(uint256 _taskId) external;

    // ─── Ratings ─────────────────────────────────────────────

    /// @notice Agent rates the worker after task completion (1–5).
    /// @param _taskId Task identifier.
    /// @param _score  Rating score.
    function rateWorker(uint256 _taskId, uint8 _score) external;

    /// @notice Worker rates the agent after task completion (1–5).
    /// @param _taskId Task identifier.
    /// @param _score  Rating score.
    function rateAgent(uint256 _taskId, uint8 _score) external;

    // ─── View ────────────────────────────────────────────────

    /// @notice Returns the full Task struct for a given task ID.
    /// @param _taskId Task identifier (1-indexed).
    /// @return        Task struct; all fields zero-valued if the ID does not exist.
    function getTask(uint256 _taskId) external view returns (Task memory);

    /// @notice Returns the floor average rating and rating count for a worker.
    /// @param _worker Worker address to query.
    /// @return avg    Floor-averaged score (0 if never rated).
    /// @return count  Total number of ratings received.
    function getWorkerRating(address _worker) external view returns (uint256 avg, uint256 count);

    /// @notice Returns the floor average rating and rating count for an agent.
    /// @param _agent Agent address to query.
    /// @return avg   Floor-averaged score (0 if never rated).
    /// @return count Total number of ratings received.
    function getAgentRating(address _agent) external view returns (uint256 avg, uint256 count);

    /// @notice Total number of tasks ever created. Also equals the highest valid task ID.
    /// @return Total task count.
    function taskCount() external view returns (uint256);

    /// @notice Platform fee charged on each successful payout, in basis points.
    /// @return Fee in bps (e.g. 250 = 2.5%).
    function platformFeeBps() external view returns (uint256);

    /// @notice Address that receives the platform fee on every completed task.
    /// @return Fee recipient address.
    function feeRecipient() external view returns (address);

    /// @notice Returns true if the given token is whitelisted for use as a reward.
    /// @param token ERC-20 token address to check.
    /// @return      True if allowed; false otherwise.
    function allowedTokens(address token) external view returns (bool);
}
