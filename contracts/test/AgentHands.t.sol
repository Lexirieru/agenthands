// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentHands} from "../src/AgentHands.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract AgentHandsTest is Test {
    AgentHands public hands;

    address owner = address(this);
    address agent = address(0xA1);
    address worker = address(0xB1);
    address feeRecipient = address(0xFEE);

    uint256 constant REWARD = 1 ether;
    uint256 deadline;
    uint256 completionDeadline;

    function setUp() public {
        // Deploy implementation + proxy (UUPS)
        AgentHands impl = new AgentHands();
        bytes memory initData = abi.encodeWithSelector(
            AgentHands.initialize.selector,
            feeRecipient,
            250 // 2.5% fee
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        hands = AgentHands(address(proxy));

        vm.deal(agent, 100 ether);
        vm.deal(worker, 1 ether);

        deadline = block.timestamp + 1 days;
        completionDeadline = block.timestamp + 3 days;
    }

    // ─── Helpers ─────────────────────────────────────────────
    function _createTask() internal returns (uint256) {
        vm.prank(agent);
        return hands.createTask{value: REWARD}(
            deadline,
            completionDeadline,
            "Pick up documents",
            "Go to city hall and pick up building permit",
            "City Hall, Jakarta"
        );
    }

    function _acceptTask(uint256 taskId) internal {
        vm.prank(worker);
        hands.acceptTask(taskId);
    }

    function _submitProof(uint256 taskId) internal {
        vm.prank(worker);
        hands.submitProof(taskId, "QmProofCID123abc");
    }

    // ─── Tests: Proxy ────────────────────────────────────────
    function test_InitializedCorrectly() public view {
        assertEq(hands.owner(), owner);
        assertEq(hands.feeRecipient(), feeRecipient);
        assertEq(hands.platformFeeBps(), 250);
    }

    function test_CannotInitializeTwice() public {
        vm.expectRevert();
        hands.initialize(feeRecipient, 250);
    }

    // ─── Tests: Create ───────────────────────────────────────
    function test_CreateTask_LocksValue() public {
        uint256 contractBefore = address(hands).balance;
        uint256 taskId = _createTask();

        assertEq(taskId, 1);
        assertEq(address(hands).balance - contractBefore, REWARD);

        AgentHands.Task memory task = hands.getTask(taskId);
        assertEq(task.agent, agent);
        assertEq(task.reward, REWARD);
        assertEq(uint8(task.status), uint8(AgentHands.TaskStatus.Open));
        assertEq(task.title, "Pick up documents");
    }

    function test_RevertCreateTask_ZeroReward() public {
        vm.prank(agent);
        vm.expectRevert(AgentHands.InvalidReward.selector);
        hands.createTask{value: 0}(deadline, completionDeadline, "t", "d", "l");
    }

    function test_RevertCreateTask_BadDeadline() public {
        vm.prank(agent);
        vm.expectRevert(AgentHands.InvalidDeadline.selector);
        hands.createTask{value: REWARD}(block.timestamp, completionDeadline, "t", "d", "l");
    }

    function test_RevertCreateTask_CompletionBeforeDeadline() public {
        vm.prank(agent);
        vm.expectRevert(AgentHands.InvalidDeadline.selector);
        hands.createTask{value: REWARD}(deadline, deadline, "t", "d", "l");
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

        uint256 workerBefore = worker.balance;
        uint256 feeBefore = feeRecipient.balance;

        vm.prank(agent);
        hands.approveTask(taskId);

        uint256 expectedFee = (REWARD * 250) / 10000;
        uint256 expectedPayout = REWARD - expectedFee;

        assertEq(worker.balance - workerBefore, expectedPayout);
        assertEq(feeRecipient.balance - feeBefore, expectedFee);

        AgentHands.Task memory task = hands.getTask(taskId);
        assertEq(uint8(task.status), uint8(AgentHands.TaskStatus.Completed));
    }

    // ─── Tests: Cancel ───────────────────────────────────────
    function test_CancelTask_Refunds() public {
        uint256 taskId = _createTask();
        uint256 agentBefore = agent.balance;

        vm.prank(agent);
        hands.cancelTask(taskId);

        assertEq(agent.balance - agentBefore, REWARD);

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

        uint256 workerBefore = worker.balance;
        hands.resolveDispute(taskId, true);

        uint256 expectedFee = (REWARD * 250) / 10000;
        uint256 expectedPayout = REWARD - expectedFee;
        assertEq(worker.balance - workerBefore, expectedPayout);
    }

    function test_DisputeAndResolve_AgentWins() public {
        uint256 taskId = _createTask();
        _acceptTask(taskId);
        _submitProof(taskId);

        vm.prank(agent);
        hands.disputeTask(taskId);

        uint256 agentBefore = agent.balance;
        hands.resolveDispute(taskId, false);

        assertEq(agent.balance - agentBefore, REWARD);
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

    // ─── Tests: Claim Expired ─────────────────────────────────
    function test_ClaimExpired_OpenTask() public {
        uint256 taskId = _createTask();

        vm.warp(deadline + 1);

        uint256 balBefore = agent.balance;
        hands.claimExpired(taskId);
        uint256 balAfter = agent.balance;

        assertEq(balAfter - balBefore, REWARD);
        assertEq(uint256(hands.getTask(taskId).status), uint256(AgentHands.TaskStatus.Expired));
    }

    function test_ClaimExpired_AcceptedButNoSubmit() public {
        uint256 taskId = _createTask();
        _acceptTask(taskId);

        vm.warp(completionDeadline + 1);

        uint256 balBefore = agent.balance;
        hands.claimExpired(taskId);
        uint256 balAfter = agent.balance;

        assertEq(balAfter - balBefore, REWARD);
        assertEq(uint256(hands.getTask(taskId).status), uint256(AgentHands.TaskStatus.Expired));
    }

    function test_ClaimExpired_SubmittedAutoApprove() public {
        uint256 taskId = _createTask();
        _acceptTask(taskId);
        _submitProof(taskId);

        vm.warp(completionDeadline + 7 days + 1);

        uint256 workerBefore = worker.balance;
        uint256 feeBefore = feeRecipient.balance;
        hands.claimExpired(taskId);
        uint256 workerAfter = worker.balance;
        uint256 feeAfter = feeRecipient.balance;

        uint256 expectedFee = (REWARD * 250) / 10000;
        uint256 expectedPayout = REWARD - expectedFee;
        assertEq(workerAfter - workerBefore, expectedPayout);
        assertEq(feeAfter - feeBefore, expectedFee);
        assertEq(uint256(hands.getTask(taskId).status), uint256(AgentHands.TaskStatus.Completed));
    }

    function test_ClaimExpired_RevertNotExpired() public {
        uint256 taskId = _createTask();
        vm.expectRevert(AgentHands.NotExpired.selector);
        hands.claimExpired(taskId);
    }

    // ─── Tests: Upgrade ──────────────────────────────────────
    function test_UpgradeOnlyOwner() public {
        AgentHands newImpl = new AgentHands();

        vm.prank(agent);
        vm.expectRevert();
        hands.upgradeToAndCall(address(newImpl), "");

        hands.upgradeToAndCall(address(newImpl), "");
    }
}
