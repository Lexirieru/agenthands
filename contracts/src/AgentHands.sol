// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {ReentrancyGuard} from "./lib/ReentrancyGuard.sol";

/// @title AgentHands — Marketplace where AI agents hire humans for physical-world tasks
/// @notice Supports USDC (Base) and cUSD (Celo) as payment tokens
/// @dev Tasks flow: Created → Accepted → Completed/Disputed → Resolved
contract AgentHands is ReentrancyGuard {
    // ─── Enums ───────────────────────────────────────────────
    enum TaskStatus {
        Open,       // Agent posted, waiting for worker
        Accepted,   // Worker accepted, in progress
        Submitted,  // Worker submitted proof, pending approval
        Completed,  // Agent approved, payment released
        Disputed,   // Agent disputed the proof
        Cancelled,  // Agent cancelled before acceptance
        Expired     // Deadline passed, no acceptance
    }

    // ─── Structs ─────────────────────────────────────────────
    struct Task {
        uint256 id;
        address agent;          // AI agent's wallet (task poster)
        address worker;         // Human worker (task acceptor)
        address paymentToken;   // USDC or cUSD address
        uint256 reward;         // Payment amount (in token decimals)
        uint256 deadline;       // Unix timestamp — accept before this
        uint256 completionDeadline; // Unix timestamp — complete before this
        string title;
        string description;
        string location;        // Physical location for the task
        string proofCID;        // IPFS CID of completion proof
        TaskStatus status;
        uint256 createdAt;
    }

    // ─── State ───────────────────────────────────────────────
    uint256 public taskCount;
    mapping(uint256 => Task) public tasks;
    
    // Allowed payment tokens (USDC, cUSD, etc.)
    mapping(address => bool) public allowedTokens;
    
    // Platform fee (basis points, e.g. 250 = 2.5%)
    uint256 public platformFeeBps;
    address public feeRecipient;
    address public owner;
    
    // Worker ratings: worker => (totalScore, ratingCount)
    mapping(address => uint256) public workerTotalScore;
    mapping(address => uint256) public workerRatingCount;
    
    // Agent ratings: agent => (totalScore, ratingCount)
    mapping(address => uint256) public agentTotalScore;
    mapping(address => uint256) public agentRatingCount;

    // ─── Events ──────────────────────────────────────────────
    event TaskCreated(uint256 indexed taskId, address indexed agent, uint256 reward, address paymentToken);
    event TaskAccepted(uint256 indexed taskId, address indexed worker);
    event ProofSubmitted(uint256 indexed taskId, string proofCID);
    event TaskCompleted(uint256 indexed taskId, address indexed worker, uint256 payout);
    event TaskDisputed(uint256 indexed taskId, address indexed agent);
    event TaskCancelled(uint256 indexed taskId);
    event DisputeResolved(uint256 indexed taskId, bool workerWins);
    event WorkerRated(uint256 indexed taskId, address indexed worker, uint8 score);
    event AgentRated(uint256 indexed taskId, address indexed agent, uint8 score);
    event TokenAllowed(address token, bool allowed);

    // ─── Errors ──────────────────────────────────────────────
    error InvalidToken();
    error InvalidReward();
    error InvalidDeadline();
    error TaskNotOpen();
    error TaskNotAccepted();
    error TaskNotSubmitted();
    error TaskNotDisputed();
    error NotAgent();
    error NotWorker();
    error NotOwner();
    error DeadlinePassed();
    error CompletionDeadlinePassed();
    error TransferFailed();
    error InvalidRating();
    error AlreadyRated();

    // ─── Modifiers ───────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyAgent(uint256 _taskId) {
        if (msg.sender != tasks[_taskId].agent) revert NotAgent();
        _;
    }

    modifier onlyWorker(uint256 _taskId) {
        if (msg.sender != tasks[_taskId].worker) revert NotWorker();
        _;
    }

    // ─── Constructor ─────────────────────────────────────────
    constructor(address _feeRecipient, uint256 _platformFeeBps) {
        owner = msg.sender;
        feeRecipient = _feeRecipient;
        platformFeeBps = _platformFeeBps;
    }

    // ─── Admin ───────────────────────────────────────────────
    function setAllowedToken(address _token, bool _allowed) external onlyOwner {
        allowedTokens[_token] = _allowed;
        emit TokenAllowed(_token, _allowed);
    }

    function setFee(uint256 _feeBps, address _recipient) external onlyOwner {
        platformFeeBps = _feeBps;
        feeRecipient = _recipient;
    }

    // ─── Core: Create Task ───────────────────────────────────
    /// @notice Agent creates a task and locks payment in escrow
    /// @param _paymentToken Address of USDC/cUSD token
    /// @param _reward Amount to pay worker (in token decimals)
    /// @param _deadline Timestamp: worker must accept before this
    /// @param _completionDeadline Timestamp: worker must complete before this
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

        // Transfer tokens to contract (escrow)
        bool success = IERC20(_paymentToken).transferFrom(msg.sender, address(this), _reward);
        if (!success) revert TransferFailed();

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
    /// @notice Human worker accepts an open task
    function acceptTask(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        if (task.status != TaskStatus.Open) revert TaskNotOpen();
        if (block.timestamp > task.deadline) revert DeadlinePassed();

        task.worker = msg.sender;
        task.status = TaskStatus.Accepted;

        emit TaskAccepted(_taskId, msg.sender);
    }

    // ─── Core: Submit Proof ──────────────────────────────────
    /// @notice Worker submits proof of completion (IPFS CID)
    function submitProof(uint256 _taskId, string calldata _proofCID) external onlyWorker(_taskId) {
        Task storage task = tasks[_taskId];
        if (task.status != TaskStatus.Accepted) revert TaskNotAccepted();
        if (block.timestamp > task.completionDeadline) revert CompletionDeadlinePassed();

        task.proofCID = _proofCID;
        task.status = TaskStatus.Submitted;

        emit ProofSubmitted(_taskId, _proofCID);
    }

    // ─── Core: Approve & Release Payment ─────────────────────
    /// @notice Agent approves proof and releases payment to worker
    function approveTask(uint256 _taskId) external onlyAgent(_taskId) nonReentrant {
        Task storage task = tasks[_taskId];
        if (task.status != TaskStatus.Submitted) revert TaskNotSubmitted();

        task.status = TaskStatus.Completed;

        _releaseFunds(task);

        emit TaskCompleted(_taskId, task.worker, task.reward);
    }

    // ─── Core: Dispute ───────────────────────────────────────
    /// @notice Agent disputes the submitted proof
    function disputeTask(uint256 _taskId) external onlyAgent(_taskId) {
        Task storage task = tasks[_taskId];
        if (task.status != TaskStatus.Submitted) revert TaskNotSubmitted();

        task.status = TaskStatus.Disputed;

        emit TaskDisputed(_taskId, msg.sender);
    }

    // ─── Core: Resolve Dispute ───────────────────────────────
    /// @notice Owner resolves dispute (simple arbitration)
    function resolveDispute(uint256 _taskId, bool _workerWins) external onlyOwner nonReentrant {
        Task storage task = tasks[_taskId];
        if (task.status != TaskStatus.Disputed) revert TaskNotDisputed();

        if (_workerWins) {
            task.status = TaskStatus.Completed;
            _releaseFunds(task);
        } else {
            task.status = TaskStatus.Cancelled;
            // Refund agent
            bool success = IERC20(task.paymentToken).transfer(task.agent, task.reward);
            if (!success) revert TransferFailed();
        }

        emit DisputeResolved(_taskId, _workerWins);
    }

    // ─── Core: Cancel Task ───────────────────────────────────
    /// @notice Agent cancels an open task (not yet accepted)
    function cancelTask(uint256 _taskId) external onlyAgent(_taskId) nonReentrant {
        Task storage task = tasks[_taskId];
        if (task.status != TaskStatus.Open) revert TaskNotOpen();

        task.status = TaskStatus.Cancelled;

        // Refund agent
        bool success = IERC20(task.paymentToken).transfer(task.agent, task.reward);
        if (!success) revert TransferFailed();

        emit TaskCancelled(_taskId);
    }

    // ─── Ratings ─────────────────────────────────────────────
    /// @notice Agent rates a worker after task completion (1-5)
    mapping(uint256 => bool) public workerRatedForTask;
    
    function rateWorker(uint256 _taskId, uint8 _score) external onlyAgent(_taskId) {
        if (_score < 1 || _score > 5) revert InvalidRating();
        if (tasks[_taskId].status != TaskStatus.Completed) revert TaskNotSubmitted();
        if (workerRatedForTask[_taskId]) revert AlreadyRated();

        workerRatedForTask[_taskId] = true;
        address worker = tasks[_taskId].worker;
        workerTotalScore[worker] += _score;
        workerRatingCount[worker]++;

        emit WorkerRated(_taskId, worker, _score);
    }

    /// @notice Worker rates an agent after task completion (1-5)
    mapping(uint256 => bool) public agentRatedForTask;
    
    function rateAgent(uint256 _taskId, uint8 _score) external onlyWorker(_taskId) {
        if (_score < 1 || _score > 5) revert InvalidRating();
        if (tasks[_taskId].status != TaskStatus.Completed) revert TaskNotSubmitted();
        if (agentRatedForTask[_taskId]) revert AlreadyRated();

        agentRatedForTask[_taskId] = true;
        address agent = tasks[_taskId].agent;
        agentTotalScore[agent] += _score;
        agentRatingCount[agent]++;

        emit AgentRated(_taskId, agent, _score);
    }

    // ─── View ────────────────────────────────────────────────
    function getTask(uint256 _taskId) external view returns (Task memory) {
        return tasks[_taskId];
    }

    function getWorkerRating(address _worker) external view returns (uint256 avg, uint256 count) {
        count = workerRatingCount[_worker];
        avg = count > 0 ? workerTotalScore[_worker] / count : 0;
    }

    function getAgentRating(address _agent) external view returns (uint256 avg, uint256 count) {
        count = agentRatingCount[_agent];
        avg = count > 0 ? agentTotalScore[_agent] / count : 0;
    }

    // ─── Internal ────────────────────────────────────────────
    function _releaseFunds(Task storage task) internal {
        uint256 fee = (task.reward * platformFeeBps) / 10000;
        uint256 payout = task.reward - fee;

        if (fee > 0) {
            bool feeSuccess = IERC20(task.paymentToken).transfer(feeRecipient, fee);
            if (!feeSuccess) revert TransferFailed();
        }

        bool success = IERC20(task.paymentToken).transfer(task.worker, payout);
        if (!success) revert TransferFailed();
    }
}
