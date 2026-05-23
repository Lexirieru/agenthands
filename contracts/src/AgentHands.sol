// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title  AgentHands
/// @author Axel Urwawuska Atarubby
/// @notice Decentralized marketplace where AI agents hire humans for physical-world tasks.
///         Tasks are funded upfront via ERC-20 escrow and released on proof approval.
///         Built on Celo mainnet using USDC as the primary payment token.
/// @dev    UUPS upgradeable proxy pattern (OpenZeppelin v5).
///         Task lifecycle: Open → Accepted → Submitted → Completed | Disputed → Resolved.
///         The owner whitelists accepted payment tokens via `setAllowedToken`.
///         A platform fee (in basis points) is deducted from every successful payout.
/// @custom:security-contact security@agenthands.xyz
contract AgentHands is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;

    // ─── Enums ───────────────────────────────────────────────

    /// @notice Represents the lifecycle state of a task.
    /// @dev    State transitions are strictly enforced — no backwards movement allowed.
    ///         Numeric values are stable on-chain (ABI-encoded) and must not be reordered.
    ///         - 0 Open:      task posted by agent, waiting for a worker to accept.
    ///         - 1 Accepted:  worker accepted the task and is actively working on it.
    ///         - 2 Submitted: worker uploaded proof of completion; pending agent review.
    ///         - 3 Completed: agent approved the proof; reward released to worker.
    ///         - 4 Disputed:  agent rejected the proof; awaiting owner arbitration via resolveDispute().
    ///         - 5 Cancelled: agent cancelled before any worker accepted; reward refunded.
    ///         - 6 Expired:   claimExpired() triggered after a deadline lapsed; reward refunded.
    enum TaskStatus {
        Open,       // Task posted by agent, waiting for a worker to accept
        Accepted,   // Worker accepted the task and is working on it
        Submitted,  // Worker uploaded proof of completion, pending agent review
        Completed,  // Agent approved the proof; payment has been released
        Disputed,   // Agent rejected the proof; awaiting owner arbitration
        Cancelled,  // Agent cancelled before any worker accepted
        Expired     // Deadline passed without acceptance or completion
    }

    // ─── Structs ─────────────────────────────────────────────

    /// @notice Full on-chain representation of a task.
    /// @dev    Stored in `tasks` mapping indexed by `taskId`.
    struct Task {
        uint256 id;
        address agent;              // Address of the AI agent that posted the task
        address worker;             // Address of the human worker who accepted it
        address paymentToken;       // ERC-20 token used for the reward (e.g. USDC)
        uint256 reward;             // Reward amount in the token's native decimals
        uint256 deadline;           // Unix timestamp — workers must accept before this
        uint256 completionDeadline; // Unix timestamp — worker must submit proof before this
        string title;
        string description;
        string location;            // Physical location where the task must be performed
        string proofCID;            // IPFS CID of the worker's completion proof
        TaskStatus status;
        uint256 createdAt;          // Block timestamp at task creation
    }

    // ─── State ───────────────────────────────────────────────

    /// @notice Total number of tasks ever created on Celo mainnet. Also used as the next task ID.
    /// @dev    Pre-incremented in `createTask` so the first task has ID 1 (never 0).
    uint256 public taskCount;

    /// @notice Maps task ID to its on-chain Task struct on Celo mainnet.
    /// @dev    IDs start at 1; ID 0 is never valid and will return a zero-value struct.
    mapping(uint256 => Task) public tasks;

    /// @notice Whitelist of ERC-20 tokens accepted as Celo task payment.
    /// @dev    Only the proxy owner can add or remove tokens via `setAllowedToken`.
    ///         Celo mainnet: USDC `0xcebA9300…`, USDT, USDm, CELO ERC-20 `0x471EcE3…`.
    mapping(address => bool) public allowedTokens;

    /// @notice Platform fee charged on successful Celo payouts, expressed in basis points.
    /// @dev    e.g. 250 = 2.5% (current mainnet default). Applied in `_releaseFunds`.
    ///         Owner can update via `setFee`; new value applies to future payouts only.
    uint256 public platformFeeBps;

    /// @notice Address that receives the platform fee on every completed Celo task.
    /// @dev    Updated atomically with `platformFeeBps` in `setFee`; never zero after initialisation.
    address public feeRecipient;

    /// @notice Cumulative rating score per Celo worker address across all rated tasks.
    /// @dev    Divided by `workerRatingCount` in `getWorkerRating` to compute the floor-average.
    mapping(address => uint256) public workerTotalScore;

    /// @notice Number of times a worker has been rated.
    mapping(address => uint256) public workerRatingCount;

    /// @notice Cumulative rating score per agent across all rated tasks.
    mapping(address => uint256) public agentTotalScore;

    /// @notice Number of times an agent has been rated.
    mapping(address => uint256) public agentRatingCount;

    /// @notice Tracks whether the worker has already been rated for a given Celo task.
    /// @dev    Prevents double-rating; set to `true` in `rateWorker` and never reset.
    mapping(uint256 => bool) public workerRatedForTask;

    /// @notice Tracks whether the agent has already been rated for a given Celo task.
    /// @dev    Prevents double-rating; set to `true` in `rateAgent` and never reset.
    mapping(uint256 => bool) public agentRatedForTask;

    // ─── Events ──────────────────────────────────────────────

    /// @notice Emitted when a new task is created and the reward is locked in escrow on Celo.
    /// @param taskId       Unique 1-based task ID assigned by `++taskCount`.
    /// @param agent        Celo address of the AI agent that posted the task.
    /// @param reward       Reward amount locked in escrow (token-native decimals).
    /// @param paymentToken Whitelisted ERC-20 token address used for the reward.
    event TaskCreated(uint256 indexed taskId, address indexed agent, uint256 reward, address paymentToken);

    /// @notice Emitted when a Celo worker accepts an open task; transitions status Open → Accepted.
    /// @param taskId The ID of the accepted task.
    /// @param worker Celo address of the human worker who accepted the task.
    event TaskAccepted(uint256 indexed taskId, address indexed worker);

    /// @notice Emitted when a Celo worker submits IPFS proof of completion; transitions Accepted → Submitted.
    /// @param taskId   The ID of the task.
    /// @param proofCID Pinata/IPFS CID (CIDv1 or legacy CIDv0) pointing to the uploaded proof.
    event ProofSubmitted(uint256 indexed taskId, string proofCID);

    /// @notice Emitted when a task is completed and the reward is released to the worker.
    /// @param taskId The ID of the completed task.
    /// @param worker The worker who received the payout.
    /// @param payout The net amount paid out after the platform fee.
    event TaskCompleted(uint256 indexed taskId, address indexed worker, uint256 payout);

    /// @notice Emitted when an agent disputes the worker's submitted proof.
    /// @param taskId The ID of the disputed task.
    /// @param agent  The agent who raised the dispute.
    event TaskDisputed(uint256 indexed taskId, address indexed agent);

    /// @notice Emitted when an agent cancels an open task.
    /// @param taskId The ID of the cancelled task.
    event TaskCancelled(uint256 indexed taskId);

    /// @notice Emitted when the owner resolves a disputed task.
    /// @param taskId      The ID of the resolved task.
    /// @param workerWins  True if the reward was sent to the worker; false if refunded to the agent.
    event DisputeResolved(uint256 indexed taskId, bool workerWins);

    /// @notice Emitted when an agent rates the worker after task completion.
    /// @param taskId The ID of the completed task.
    /// @param worker The worker being rated.
    /// @param score  Rating score between 1 and 5.
    event WorkerRated(uint256 indexed taskId, address indexed worker, uint8 score);

    /// @notice Emitted when a worker rates the agent after task completion.
    /// @param taskId The ID of the completed task.
    /// @param agent  The agent being rated.
    /// @param score  Rating score between 1 and 5.
    event AgentRated(uint256 indexed taskId, address indexed agent, uint8 score);

    /// @notice Emitted when a token's whitelist status changes.
    /// @param token   The ERC-20 token address.
    /// @param allowed True if the token is now allowed; false if removed.
    event TokenAllowed(address token, bool allowed);

    /// @notice Emitted when an expired task is refunded to the agent.
    /// @param taskId The ID of the expired task.
    /// @param agent  The agent who received the refund.
    /// @param refund The amount refunded.
    event TaskExpired(uint256 indexed taskId, address indexed agent, uint256 refund);

    /// @notice Emitted when a submitted task is auto-approved after the review window expires.
    /// @param taskId The ID of the auto-completed task.
    /// @param worker The worker who received the payout.
    /// @param payout The net payout after fees.
    event TaskAutoCompleted(uint256 indexed taskId, address indexed worker, uint256 payout);
    /// @notice Emitted when the platform fee rate or fee recipient is updated.
    /// @dev    The new `feeBps` value applies only to payouts triggered after this event.
    ///         Tasks already funded on Celo mainnet are settled at the fee rate active
    ///         when their `approveTask` / `resolveDispute` / `claimExpired` is called.
    /// @param feeBps    New platform fee in basis points (e.g. 250 = 2.5%).
    /// @param recipient New address to receive the platform fee on each payout.
    event FeeUpdated(uint256 feeBps, address recipient);

    // ─── Errors ──────────────────────────────────────────────

    /// @notice Thrown when the payment token is not on the Celo whitelist.
    /// @dev    Reverts in `createTask` when `allowedTokens[_paymentToken]` is `false`.
    error InvalidToken();

    /// @notice Thrown when the reward amount is zero on Celo.
    /// @dev    Reverts in `createTask` when `_reward == 0`; prevents zero-value escrow entries.
    error InvalidReward();

    /// @notice Thrown when a deadline is in the past or logically inconsistent on Celo.
    /// @dev    Reverts in `createTask` when `_deadline <= block.timestamp` or
    ///         `_completionDeadline <= _deadline`. Celo block timestamps advance ~5 s per block.
    error InvalidDeadline();

    /// @notice Thrown when an action requires `TaskStatus.Open` but the task is not open.
    error TaskNotOpen();

    /// @notice Thrown when an action requires `TaskStatus.Accepted` but the task is not accepted.
    error TaskNotAccepted();

    /// @notice Thrown when an action requires `TaskStatus.Submitted` but proof has not been submitted.
    error TaskNotSubmitted();

    /// @notice Thrown when resolving a dispute on a task that is not in `Disputed` status.
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

    /// @notice Thrown when `claimExpired` is called on a task that has not expired.
    error NotExpired();

    // ─── Modifiers ───────────────────────────────────────────

    /// @notice Restricts access to the AI agent that created the specified task.
    /// @dev    On Celo, agents are typically autonomous AI programs calling the contract
    ///         via a funded USDC wallet. Reverts with `NotAgent` if `msg.sender` does not
    ///         match `tasks[_taskId].agent`.
    modifier onlyAgent(uint256 _taskId) {
        if (msg.sender != tasks[_taskId].agent) revert NotAgent();
        _;
    }

    /// @notice Restricts access to the human worker assigned to the specified task.
    /// @dev    Workers on Celo are verified humans (Self Protocol ZK proof); this modifier
    ///         only checks the assigned address, not the identity proof itself. Reverts with
    ///         `NotWorker` if `msg.sender` does not match `tasks[_taskId].worker`.
    modifier onlyWorker(uint256 _taskId) {
        if (msg.sender != tasks[_taskId].worker) revert NotWorker();
        _;
    }

    // ─── Constructor ─────────────────────────────────────────

    /// @notice Locks the implementation contract to prevent direct initialization.
    /// @dev    Calls `_disableInitializers()` so the implementation bytecode itself
    ///         cannot be initialized — only the ERC-1967 proxy deployed on Celo mainnet
    ///         (`0xADA0466303441102cb16F8eC1594C744d603f746`) runs the `initialize` path.
    ///         Required by OpenZeppelin's UUPS upgradeable pattern (v5).
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ─── Initializer ─────────────────────────────────────────

    /// @notice Initializes the UUPS proxy: sets the deployer as owner, configures
    ///         the platform fee recipient and fee rate, and arms all OZ upgradeable
    ///         initializers (`Ownable`, `UUPSUpgradeable`).
    /// @dev    Called exactly once through the proxy during deployment — the
    ///         `initializer` modifier from OpenZeppelin enforces single-call semantics.
    ///         Replaces a constructor in the upgradeable pattern.
    ///         The deployer (`msg.sender`) becomes the initial owner and is the only
    ///         address that can call `_authorizeUpgrade` or admin functions thereafter.
    ///         On Celo mainnet this was called with `_feeRecipient = deployer` and
    ///         `_platformFeeBps = 250` (2.5%). USDC (`0xcebA9300f2b948710d2653dD7B07f33A8B32118C`)
    ///         was whitelisted via `setAllowedToken` in the same deploy broadcast.
    /// @param _feeRecipient   Address that will receive platform fees.
    /// @param _platformFeeBps Fee in basis points (e.g. 250 = 2.5%).
    function initialize(address _feeRecipient, uint256 _platformFeeBps) external initializer {
        __Ownable_init(msg.sender);

        feeRecipient = _feeRecipient;
        platformFeeBps = _platformFeeBps;
    }

    // ─── UUPS Authorization ──────────────────────────────────

    /// @notice Guards implementation upgrades so only the proxy owner can authorize them.
    /// @dev    Overrides `UUPSUpgradeable._authorizeUpgrade`. The `onlyOwner` modifier
    ///         ensures that only the contract owner can push a new implementation through
    ///         the Celo mainnet proxy (`0xADA0466303441102cb16F8eC1594C744d603f746`).
    ///         Function body is intentionally empty — the guard is entirely in the modifier.
    ///         Upgrade flow: deploy new impl → call `upgradeToAndCall(newImpl, "")` on proxy.
    /// @param newImplementation Address of the new implementation contract to upgrade to.
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ─── Admin ───────────────────────────────────────────────

    /// @notice Adds or removes a token from the payment whitelist.
    /// @dev    Only callable by the owner. Current whitelist on Celo mainnet:
    ///         - USDC: `0xcebA9300f2b948710d2653dD7B07f33A8B32118C`
    ///         - CELO ERC-20: `0x471EcE3750Da237f93B8E339c536989b8978a438`
    ///         Removing a token does not affect tasks already funded with it — active
    ///         escrow settles in the original token regardless of whitelist changes.
    /// @param _token   ERC-20 token address to whitelist or remove.
    /// @param _allowed True to allow the token; false to remove it.
    function setAllowedToken(address _token, bool _allowed) external onlyOwner {
        allowedTokens[_token] = _allowed;
        emit TokenAllowed(_token, _allowed);
    }

    /// @notice Updates the platform fee and the fee recipient address.
    /// @dev    Only callable by the owner. Applies to future payouts only —
    ///         tasks already in flight are unaffected.
    ///         Basis-point cap: 10 000 bps = 100% — callers should keep the fee
    ///         well below this (current Celo mainnet deployment: 250 bps = 2.5%).
    ///         Example: on a 10 USDC task, fee = 0.25 USDC, worker receives 9.75 USDC.
    ///         There is intentionally no on-chain cap enforcement, relying instead
    ///         on owner key security and the `FeeUpdated` event for off-chain monitoring.
    /// @param _feeBps    New fee in basis points (1 bps = 0.01%).
    /// @param _recipient New address to receive platform fees.
    function setFee(uint256 _feeBps, address _recipient) external onlyOwner {
        platformFeeBps = _feeBps;
        feeRecipient = _recipient;
        emit FeeUpdated(_feeBps, _recipient);
    }

    // ─── Core: Create Task ───────────────────────────────────

    /// @notice Creates a new task and locks the reward in escrow.
    /// @dev    The caller must have approved this contract to transfer `_reward`
    ///         of `_paymentToken` before calling (ERC-20 "pull" pattern). The reward is held
    ///         in the contract's balance until the task is completed, cancelled, or expired.
    ///         Celo ERC-20 pull pattern: the agent calls `USDC.approve(AgentHands, amount)` in
    ///         a separate tx (or via `permit` / EIP-3009 authorization) then calls `createTask`.
    ///         USDC on Celo (`0xcebA9300f2b948710d2653dD7B07f33A8B32118C`) uses 6 decimals —
    ///         pass `_reward` in micro-USDC (e.g. `1_000_000` = $1.00, `250_000` = $0.25).
    ///         CELO ERC-20 (`0x471EcE3750Da237f93B8E339c536989b8978a438`) uses 18 decimals —
    ///         pass `_reward` in wei (e.g. `1e18` = 1 CELO). Volatile value; no $ prefix in UI.
    ///         Agents using CIP-64 fee abstraction can pay this transaction's gas in USDC,
    ///         eliminating the need to hold a separate native CELO balance.
    ///         Reentrancy: guarded by `nonReentrant` because `safeTransferFrom` on
    ///         certain ERC-20 tokens (e.g. ERC-777 hooks or fee-on-transfer tokens)
    ///         can re-enter. State is written after the transfer to preserve CEI order.
    /// @param _paymentToken       ERC-20 token address for the reward (must be whitelisted).
    /// @param _reward             Reward amount in the token's native decimals.
    /// @param _deadline           Unix timestamp by which a worker must accept the task.
    /// @param _completionDeadline Unix timestamp by which the worker must submit proof.
    ///                            Must be strictly after `_deadline`.
    /// @param _title              Short title describing the task.
    /// @param _description        Full description of what needs to be done.
    /// @param _location           Physical location where the task must be carried out.
    /// @return taskId             The ID assigned to the newly created task.
    function createTask(
        address _paymentToken,
        uint256 _reward,
        uint256 _deadline,
        uint256 _completionDeadline,
        string calldata _title,
        string calldata _description,
        string calldata _location
    ) external nonReentrant returns (uint256) {
        if (!allowedTokens[_paymentToken]) revert InvalidToken();
        if (_reward == 0) revert InvalidReward();
        if (_deadline <= block.timestamp) revert InvalidDeadline();
        if (_completionDeadline <= _deadline) revert InvalidDeadline();

        IERC20(_paymentToken).safeTransferFrom(msg.sender, address(this), _reward);

        uint256 taskId = ++taskCount;
        tasks[taskId] = Task({
            id: taskId,
            agent: msg.sender,
            worker: address(0),
            paymentToken: _paymentToken,
            reward: _reward,
            deadline: _deadline,
            completionDeadline: _completionDeadline,
            title: _title,
            description: _description,
            location: _location,
            proofCID: "",
            status: TaskStatus.Open,
            createdAt: block.timestamp
        });

        emit TaskCreated(taskId, msg.sender, _reward, _paymentToken);
        return taskId;
    }

    // ─── Core: Accept Task ───────────────────────────────────

    /// @notice Allows a human worker to accept an open task.
    /// @dev    Any address may accept as long as the task is open and the deadline
    ///         has not passed. Once accepted, the task is locked to this worker.
    ///         `completionDeadline` enforcement: the accepted worker must call `submitProof`
    ///         before `task.completionDeadline` or the agent can call `claimExpired` to
    ///         recover the escrow. With Celo's ~5 s block time, a completionDeadline set
    ///         72 hours from acceptance gives roughly 51 840 blocks of work time —
    ///         ample even for multi-day physical tasks. The frontend surfaces this as a
    ///         "Complete Before" countdown on the task detail page.
    ///         Celo wallets (MiniPay, Valora) can pay the gas for this call in USDC
    ///         via CIP-64 fee abstraction, so workers do not need a native CELO balance.
    ///         Identity verification (Self Protocol ZK proof) is enforced at the backend
    ///         API layer, not in this function — the contract accepts any EOA address.
    /// @param _taskId The ID of the task to accept.
    function acceptTask(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        if (task.status != TaskStatus.Open) revert TaskNotOpen();
        if (block.timestamp > task.deadline) revert DeadlinePassed();

        task.worker = msg.sender;
        task.status = TaskStatus.Accepted;

        emit TaskAccepted(_taskId, msg.sender);
    }

    // ─── Core: Submit Proof ──────────────────────────────────

    /// @notice Allows the assigned worker to submit an IPFS proof of task completion.
    /// @dev    Only the worker assigned via `acceptTask` may call this.
    ///         The proof CID is stored on-chain; the actual files (photos, videos) live
    ///         on IPFS. In the AgentHands reference integration, files are uploaded to
    ///         Pinata via the backend API and the returned CID is passed here. The CID
    ///         is typically a base-32 CIDv1 string (e.g. `bafybeig...`); legacy CIDv0
    ///         (base58, e.g. `Qm...`) is also accepted — the contract stores it as-is.
    ///         7-day grace period: after `completionDeadline`, the agent has 7 additional
    ///         days to review the submitted proof via `approveTask` or `disputeTask`.
    ///         If neither is called within that window, anyone may call `claimExpired`
    ///         to auto-approve the task and pay the worker — protecting workers from
    ///         non-responsive agents. With Celo's ~5 s blocks this grace covers ~120 960 blocks.
    ///         On Celo, this call's gas is payable in USDC via CIP-64 on MiniPay/Valora.
    /// @param _taskId   The ID of the accepted task.
    /// @param _proofCID IPFS content identifier pointing to the completion proof.
    function submitProof(uint256 _taskId, string calldata _proofCID) external onlyWorker(_taskId) {
        Task storage task = tasks[_taskId];
        if (task.status != TaskStatus.Accepted) revert TaskNotAccepted();
        if (block.timestamp > task.completionDeadline) revert CompletionDeadlinePassed();

        task.proofCID = _proofCID;
        task.status = TaskStatus.Submitted;

        emit ProofSubmitted(_taskId, _proofCID);
    }

    // ─── Core: Approve & Release Payment ─────────────────────

    /// @notice Agent approves the submitted proof and releases payment to the worker.
    /// @dev    Deducts the platform fee and transfers the remainder to the worker.
    ///         Uses `nonReentrant` because it performs two external token transfers.
    ///         Escrow release breakdown (via `_releaseFunds`):
    ///           fee    = reward × platformFeeBps / 10 000
    ///           payout = reward − fee
    ///         Transfer 1: fee → feeRecipient  (skipped if platformFeeBps == 0)
    ///         Transfer 2: payout → task.worker
    ///         Celo USDC example (6 decimals, reward = 10 USDC = 10_000_000):
    ///           fee = 250_000 (2.5%), worker receives 9_750_000 ($9.75 USDC).
    ///         The emitted `TaskCompleted` event carries `task.reward` (gross), not the
    ///         net payout, for easier off-chain accounting.
    ///         ERC-8004 reputation update: after this call succeeds, both the agent and
    ///         the worker may call `rateWorker` / `rateAgent` to post a 1–5 score on-chain.
    ///         These scores accumulate in the Reputation Registry indexed by the
    ///         ERC-8004 Agent Trust Protocol, so agents with consistent approval histories
    ///         build a higher on-chain trust score visible in `AgentBadge`.
    /// @param _taskId The ID of the submitted task to approve.
    function approveTask(uint256 _taskId) external onlyAgent(_taskId) nonReentrant {
        Task storage task = tasks[_taskId];
        if (task.status != TaskStatus.Submitted) revert TaskNotSubmitted();

        task.status = TaskStatus.Completed;
        _releaseFunds(task);

        emit TaskCompleted(_taskId, task.worker, task.reward);
    }

    // ─── Core: Dispute ───────────────────────────────────────

    /// @notice Agent raises a dispute against the submitted proof.
    /// @dev    Moves the task to `Disputed` status. The owner must then call
    ///         `resolveDispute` to settle the outcome.
    ///         Important: if the agent neither approves nor disputes within 7 days of
    ///         `completionDeadline`, anyone can call `claimExpired` to auto-approve the
    ///         task and pay the worker — preventing agents from stalling indefinitely.
    ///         Disputing resets this countdown; the owner must then arbitrate via `resolveDispute`.
    ///         ERC-8004 reputation update: if the owner resolves the dispute in the worker's
    ///         favour (`workerWins = true`), the task reaches `Completed` status and both
    ///         parties can post ratings. If the agent wins, the task moves to `Cancelled`
    ///         and no ratings are possible — the ERC-8004 score is not penalised
    ///         for disputed tasks where the agent prevails.
    /// @param _taskId The ID of the submitted task to dispute.
    function disputeTask(uint256 _taskId) external onlyAgent(_taskId) {
        Task storage task = tasks[_taskId];
        if (task.status != TaskStatus.Submitted) revert TaskNotSubmitted();

        task.status = TaskStatus.Disputed;
        emit TaskDisputed(_taskId, msg.sender);
    }

    // ─── Core: Resolve Dispute ───────────────────────────────

    /// @notice Owner arbitrates a disputed task and decides the outcome.
    /// @dev    If `_workerWins` is true, the reward (minus fee) is sent to the worker.
    ///         If false, the full reward is refunded to the agent.
    ///         Arbitration notes:
    ///         - This is centralised arbitration by the contract owner; future versions
    ///           may integrate decentralised dispute resolution (e.g. Kleros).
    ///         - When the agent wins, the full `task.reward` (no fee deducted) is
    ///           returned to the agent because the platform should not profit from
    ///           invalid proof disputes.
    ///         - The `DisputeResolved` event is emitted after fund transfer completes,
    ///           not before — follow the Checks-Effects-Interactions pattern downstream.
    /// @param _taskId     The ID of the disputed task.
    /// @param _workerWins True to pay the worker; false to refund the agent.
    function resolveDispute(uint256 _taskId, bool _workerWins) external onlyOwner nonReentrant {
        Task storage task = tasks[_taskId];
        if (task.status != TaskStatus.Disputed) revert TaskNotDisputed();

        if (_workerWins) {
            task.status = TaskStatus.Completed;
            _releaseFunds(task);
        } else {
            task.status = TaskStatus.Cancelled;
            IERC20(task.paymentToken).safeTransfer(task.agent, task.reward);
        }

        emit DisputeResolved(_taskId, _workerWins);
    }

    // ─── Core: Cancel Task ───────────────────────────────────

    /// @notice Agent cancels an open task before any worker has accepted it.
    /// @dev    The full reward is refunded to the agent with no platform fee deducted —
    ///         the platform only earns a fee on successful task completion.
    ///         Cannot be called once a worker has accepted the task (`TaskNotOpen` revert).
    ///         Follows Checks-Effects-Interactions: status is set to `Cancelled` before
    ///         the token transfer to prevent reentrancy even without `nonReentrant`.
    ///         `nonReentrant` is applied regardless as a defence-in-depth measure.
    /// @param _taskId The ID of the open task to cancel.
    function cancelTask(uint256 _taskId) external onlyAgent(_taskId) nonReentrant {
        Task storage task = tasks[_taskId];
        if (task.status != TaskStatus.Open) revert TaskNotOpen();

        task.status = TaskStatus.Cancelled;
        IERC20(task.paymentToken).safeTransfer(task.agent, task.reward);

        emit TaskCancelled(_taskId);
    }

    // ─── Core: Claim Expired ─────────────────────────────────

    /// @notice Permissionlessly triggers fund recovery for tasks stuck past their deadlines.
    ///         Handles three distinct expiry paths to ensure no funds are ever locked:
    ///         Path A — Open task, acceptance deadline passed:
    ///           No worker accepted in time → full reward refunded to agent, status → Expired.
    ///         Path B — Accepted task, completion deadline passed:
    ///           Worker accepted but never submitted proof → full reward refunded to agent, status → Expired.
    ///         Path C — Submitted task, completion deadline + 7-day grace period passed:
    ///           Agent never reviewed the submitted proof → auto-approved, payout sent to worker,
    ///           status → Completed. This protects workers from agents who refuse to review.
    /// @dev    Anyone may call this function — no access control needed because funds always
    ///         flow to the rightful owner regardless of who triggers it.
    ///         Reverts with `NotExpired` if none of the three conditions are met.
    ///         Celo timing: at ~5 s/block, the 7-day Path C grace period spans ~120 960 blocks.
    ///         The `TaskExpired` and `TaskAutoCompleted` events are emitted once per call;
    ///         the emitted `refund`/`payout` uses the task's own ERC-20 token (USDC or CELO
    ///         ERC-20 facade on Celo mainnet).
    /// @param _taskId The ID of the task to claim.
    function claimExpired(uint256 _taskId) external nonReentrant {
        Task storage task = tasks[_taskId];

        if (task.status == TaskStatus.Open && block.timestamp > task.deadline) {
            task.status = TaskStatus.Expired;
            IERC20(task.paymentToken).safeTransfer(task.agent, task.reward);
            emit TaskExpired(_taskId, task.agent, task.reward);
            return;
        }

        if (task.status == TaskStatus.Accepted && block.timestamp > task.completionDeadline) {
            task.status = TaskStatus.Expired;
            IERC20(task.paymentToken).safeTransfer(task.agent, task.reward);
            emit TaskExpired(_taskId, task.agent, task.reward);
            return;
        }

        if (task.status == TaskStatus.Submitted && block.timestamp > task.completionDeadline + 7 days) {
            task.status = TaskStatus.Completed;
            _releaseFunds(task);
            emit TaskAutoCompleted(_taskId, task.worker, task.reward);
            return;
        }

        revert NotExpired();
    }

    // ─── Ratings ─────────────────────────────────────────────

    /// @notice Agent rates the worker after a task is completed.
    /// @dev    Each task can only be rated once per party (`AlreadyRated` on second attempt).
    ///         Ratings are permanent and immutable — there is no update or delete path.
    ///         Scores are accumulated in `workerTotalScore` and the per-task count in
    ///         `workerRatingCount`; the floor average is derived off-chain via `getWorkerRating`.
    ///         Rating is independent of payment — it can be submitted any time after completion.
    /// @param _taskId The ID of the completed task.
    /// @param _score  Rating between 1 (lowest) and 5 (highest).
    function rateWorker(uint256 _taskId, uint8 _score) external onlyAgent(_taskId) {
        if (_score < 1 || _score > 5) revert InvalidRating();
        if (tasks[_taskId].status != TaskStatus.Completed) revert TaskNotCompleted();
        if (workerRatedForTask[_taskId]) revert AlreadyRated();

        workerRatedForTask[_taskId] = true;
        address worker = tasks[_taskId].worker;
        workerTotalScore[worker] += _score;
        workerRatingCount[worker]++;

        emit WorkerRated(_taskId, worker, _score);
    }

    /// @notice Worker rates the agent after a task is completed.
    /// @dev    Symmetric to `rateWorker` but for the agent side. Rating is permanent —
    ///         no update path exists. Reverts with `AlreadyRated` if called twice for the
    ///         same task, and `TaskNotCompleted` if the task is still in progress.
    /// @param _taskId The ID of the completed task.
    /// @param _score  Rating between 1 (lowest) and 5 (highest).
    function rateAgent(uint256 _taskId, uint8 _score) external onlyWorker(_taskId) {
        if (_score < 1 || _score > 5) revert InvalidRating();
        if (tasks[_taskId].status != TaskStatus.Completed) revert TaskNotCompleted();
        if (agentRatedForTask[_taskId]) revert AlreadyRated();

        agentRatedForTask[_taskId] = true;
        address agent = tasks[_taskId].agent;
        agentTotalScore[agent] += _score;
        agentRatingCount[agent]++;

        emit AgentRated(_taskId, agent, _score);
    }

    // ─── View ────────────────────────────────────────────────

    /// @notice Returns the implementation version string.
    /// @dev    Hardcoded in the implementation bytecode — upgrade to a new implementation
    ///         to bump this value. Useful for clients to detect which feature set is active
    ///         without inspecting the EIP-1967 implementation slot directly.
    /// @return The semver version string of this implementation (e.g. "1.1.0").
    function version() external pure returns (string memory) {
        return "1.1.0";
    }

    /// @notice Returns true if `_token` is whitelisted as a payment token.
    /// @param _token  The ERC-20 token address to check.
    /// @return        True if the token is on the whitelist; false otherwise.
    function isTokenAllowed(address _token) external view returns (bool) {
        return allowedTokens[_token];
    }

    /// @notice Returns IDs of all tasks that currently have `_status`.
    /// @dev    Performs an O(taskCount) linear scan over the full task ID range [1, taskCount].
    ///         Designed exclusively for off-chain reads (ethers.js, viem, subgraphs).
    ///         Never call this from another on-chain contract — gas cost grows unboundedly
    ///         as more tasks are created and will eventually exceed block gas limits.
    ///         The function allocates the result array in two passes to avoid dynamic resizing.
    /// @param _status The TaskStatus to filter by.
    /// @return ids    Array of task IDs whose current status matches `_status`.
    function getTasksByStatus(TaskStatus _status) external view returns (uint256[] memory ids) {
        uint256 total = taskCount;
        uint256 count;
        for (uint256 i = 1; i <= total; i++) {
            if (tasks[i].status == _status) count++;
        }
        ids = new uint256[](count);
        uint256 idx;
        for (uint256 i = 1; i <= total; i++) {
            if (tasks[i].status == _status) ids[idx++] = i;
        }
    }

    /// @notice Returns the full Task struct for a given task ID.
    /// @param _taskId  The ID of the task to retrieve.
    /// @return task    The Task struct stored at that ID (zero-value struct if ID does not exist).
    function getTask(uint256 _taskId) external view returns (Task memory) {
        return tasks[_taskId];
    }

    /// @notice Returns the average rating and total rating count for a worker.
    /// @dev    Average is computed as integer division; fractional parts are truncated.
    ///         Returns (0, 0) if the worker has never been rated.
    /// @param _worker The worker's address.
    /// @return avg    Floor average of all scores (0 if unrated).
    /// @return count  Total number of ratings received.
    function getWorkerRating(address _worker) external view returns (uint256 avg, uint256 count) {
        count = workerRatingCount[_worker];
        avg = count > 0 ? workerTotalScore[_worker] / count : 0;
    }

    /// @notice Returns the average rating and total rating count for an agent.
    /// @dev    Average is computed as integer division; fractional parts are truncated.
    ///         Returns (0, 0) if the agent has never been rated.
    /// @param _agent The agent's address.
    /// @return avg   Floor average of all scores (0 if unrated).
    /// @return count Total number of ratings received.
    function getAgentRating(address _agent) external view returns (uint256 avg, uint256 count) {
        count = agentRatingCount[_agent];
        avg = count > 0 ? agentTotalScore[_agent] / count : 0;
    }

    // ─── Internal ────────────────────────────────────────────

    /// @notice Deducts the platform fee and transfers the net reward to the worker.
    /// @dev    Called by `approveTask`, `resolveDispute` (worker wins), and `claimExpired`
    ///         (auto-complete path). If `platformFeeBps` is zero, no fee transfer is made.
    ///         Fee calculation uses integer division — any fractional wei is kept by the worker,
    ///         never by the platform. E.g. reward=101, feeBps=250 → fee=2, payout=99.
    ///         Uses `SafeERC20.safeTransfer` to handle non-standard ERC-20 tokens that
    ///         return false instead of reverting on failure.
    /// @param task Storage reference to the task being paid out.
    function _releaseFunds(Task storage task) internal {
        uint256 fee = (task.reward * platformFeeBps) / 10000;
        uint256 payout = task.reward - fee;

        if (fee > 0) {
            IERC20(task.paymentToken).safeTransfer(feeRecipient, fee);
        }
        IERC20(task.paymentToken).safeTransfer(task.worker, payout);
    }
}
