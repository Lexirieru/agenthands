// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {AgentHands} from "../src/AgentHands.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract AgentHandsTest is Test {
    AgentHands public hands;
    MockERC20 public usdc;

    address owner = address(this);
    address agent = address(0xA1);
    address worker = address(0xB1);
    address feeRecipient = address(0xFEE);

    uint256 reward = 100e6; // 100 USDC
    uint256 deadline;
    uint256 completionDeadline;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        hands = new AgentHands(feeRecipient, 250); // 2.5% fee

        hands.setAllowedToken(address(usdc), true);

        // Fund agent
        usdc.mint(agent, 1000e6);

        deadline = block.timestamp + 1 days;
        completionDeadline = block.timestamp + 3 days;
    }

    // ─── Helpers ─────────────────────────────────────────────
    function _createTask() internal returns (uint256) {
        vm.startPrank(agent);
        usdc.approve(address(hands), reward);
        uint256 taskId = hands.createTask(
            address(usdc),
            reward,
            deadline,
            completionDeadline,
            "Pick up documents",
            "Go to city hall and pick up building permit",
            "City Hall, Jakarta"
        );
        vm.stopPrank();
        return taskId;
    }

    function _acceptTask(uint256 taskId) internal {
        vm.prank(worker);
        hands.acceptTask(taskId);
    }

    function _submitProof(uint256 taskId) internal {
        vm.prank(worker);
        hands.submitProof(taskId, "QmProofCID123abc");
    }

    // ─── Tests: Create ───────────────────────────────────────
    function test_CreateTask() public {
        uint256 taskId = _createTask();

        assertEq(taskId, 1);
        assertEq(usdc.balanceOf(address(hands)), reward);
        
        AgentHands.Task memory task = hands.getTask(taskId);
        assertEq(task.agent, agent);
        assertEq(task.reward, reward);
        assertEq(uint8(task.status), uint8(AgentHands.TaskStatus.Open));
        assertEq(task.title, "Pick up documents");
    }

    function test_RevertCreateTask_InvalidToken() public {
        vm.prank(agent);
        vm.expectRevert(AgentHands.InvalidToken.selector);
        hands.createTask(address(0xDEAD), reward, deadline, completionDeadline, "t", "d", "l");
    }

    function test_RevertCreateTask_ZeroReward() public {
        vm.startPrank(agent);
        usdc.approve(address(hands), reward);
        vm.expectRevert(AgentHands.InvalidReward.selector);
        hands.createTask(address(usdc), 0, deadline, completionDeadline, "t", "d", "l");
        vm.stopPrank();
    }

    // ─── Tests: Accept ───────────────────────────────────────
    function test_AcceptTask() public {
        uint256 taskId = _createTask();
        _acceptTask(taskId);

        AgentHands.Task memory task = hands.getTask(taskId);
        assertEq(task.worker, worker);
        assertEq(uint8(task.status), uint8(AgentHands.TaskStatus.Accepted));
    }

    function test_RevertAcceptTask_DeadlinePassed() public {
        uint256 taskId = _createTask();
        vm.warp(deadline + 1);
        vm.prank(worker);
        vm.expectRevert(AgentHands.DeadlinePassed.selector);
        hands.acceptTask(taskId);
    }

    // ─── Tests: Submit Proof ─────────────────────────────────
    function test_SubmitProof() public {
        uint256 taskId = _createTask();
        _acceptTask(taskId);
        _submitProof(taskId);

        AgentHands.Task memory task = hands.getTask(taskId);
        assertEq(task.proofCID, "QmProofCID123abc");
        assertEq(uint8(task.status), uint8(AgentHands.TaskStatus.Submitted));
    }

    // ─── Tests: Approve & Payment ────────────────────────────
    function test_ApproveTask_ReleasesPayment() public {
        uint256 taskId = _createTask();
        _acceptTask(taskId);
        _submitProof(taskId);

        uint256 workerBefore = usdc.balanceOf(worker);

        vm.prank(agent);
        hands.approveTask(taskId);

        // 2.5% fee = 2.5 USDC, worker gets 97.5 USDC
        uint256 expectedFee = (reward * 250) / 10000;
        uint256 expectedPayout = reward - expectedFee;

        assertEq(usdc.balanceOf(worker) - workerBefore, expectedPayout);
        assertEq(usdc.balanceOf(feeRecipient), expectedFee);

        AgentHands.Task memory task = hands.getTask(taskId);
        assertEq(uint8(task.status), uint8(AgentHands.TaskStatus.Completed));
    }

    // ─── Tests: Cancel ───────────────────────────────────────
    function test_CancelTask_Refunds() public {
        uint256 taskId = _createTask();
        uint256 agentBefore = usdc.balanceOf(agent);

        vm.prank(agent);
        hands.cancelTask(taskId);

        assertEq(usdc.balanceOf(agent) - agentBefore, reward);
        
        AgentHands.Task memory task = hands.getTask(taskId);
        assertEq(uint8(task.status), uint8(AgentHands.TaskStatus.Cancelled));
    }

    // ─── Tests: Dispute ──────────────────────────────────────
    function test_DisputeAndResolve_WorkerWins() public {
        uint256 taskId = _createTask();
        _acceptTask(taskId);
        _submitProof(taskId);

        vm.prank(agent);
        hands.disputeTask(taskId);

        uint256 workerBefore = usdc.balanceOf(worker);
        hands.resolveDispute(taskId, true); // owner resolves, worker wins

        uint256 expectedFee = (reward * 250) / 10000;
        uint256 expectedPayout = reward - expectedFee;
        assertEq(usdc.balanceOf(worker) - workerBefore, expectedPayout);
    }

    function test_DisputeAndResolve_AgentWins() public {
        uint256 taskId = _createTask();
        _acceptTask(taskId);
        _submitProof(taskId);

        vm.prank(agent);
        hands.disputeTask(taskId);

        uint256 agentBefore = usdc.balanceOf(agent);
        hands.resolveDispute(taskId, false); // agent wins, refund

        assertEq(usdc.balanceOf(agent) - agentBefore, reward);
    }

    // ─── Tests: Ratings ──────────────────────────────────────
    function test_RateWorker() public {
        uint256 taskId = _createTask();
        _acceptTask(taskId);
        _submitProof(taskId);
        vm.prank(agent);
        hands.approveTask(taskId);

        vm.prank(agent);
        hands.rateWorker(taskId, 5);

        (uint256 avg, uint256 count) = hands.getWorkerRating(worker);
        assertEq(avg, 5);
        assertEq(count, 1);
    }

    function test_RateAgent() public {
        uint256 taskId = _createTask();
        _acceptTask(taskId);
        _submitProof(taskId);
        vm.prank(agent);
        hands.approveTask(taskId);

        vm.prank(worker);
        hands.rateAgent(taskId, 4);

        (uint256 avg, uint256 count) = hands.getAgentRating(agent);
        assertEq(avg, 4);
        assertEq(count, 1);
    }
}
