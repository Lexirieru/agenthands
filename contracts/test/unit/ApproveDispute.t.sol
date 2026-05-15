// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentHands} from "../../src/AgentHands.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ApproveDisputeTest is Test {
    AgentHands hands;
    MockERC20 usdc;

    address owner = address(this);
    address agent = address(0xA1);
    address worker = address(0xB1);
    address feeRecipient = address(0xFEE);

    uint256 constant REWARD = 100e6;
    uint256 constant FEE_BPS = 250;
    uint256 deadline;
    uint256 completionDeadline;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        AgentHands impl = new AgentHands();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(impl),
            abi.encodeWithSelector(AgentHands.initialize.selector, feeRecipient, FEE_BPS)
        );
        hands = AgentHands(address(proxy));
        hands.setAllowedToken(address(usdc), true);
        usdc.mint(agent, 1000e6);
        deadline = block.timestamp + 1 days;
        completionDeadline = block.timestamp + 3 days;
    }

    function _taskToSubmitted() internal returns (uint256) {
        vm.startPrank(agent);
        usdc.approve(address(hands), REWARD);
        uint256 id = hands.createTask(address(usdc), REWARD, deadline, completionDeadline, "T", "D", "L");
        vm.stopPrank();
        vm.prank(worker);
        hands.acceptTask(id);
        vm.prank(worker);
        hands.submitProof(id, "ipfs://Qm123");
        return id;
    }

    // ─── approveTask ──────────────────────────────────────────

    function test_approveTask_releasesPaymentToWorker() public {
        uint256 id = _taskToSubmitted();
        uint256 expectedFee = (REWARD * FEE_BPS) / 10000;
        uint256 expectedPayout = REWARD - expectedFee;

        vm.prank(agent);
        hands.approveTask(id);

        assertEq(usdc.balanceOf(worker), expectedPayout);
        assertEq(usdc.balanceOf(feeRecipient), expectedFee);
        assertEq(uint8(hands.getTask(id).status), uint8(AgentHands.TaskStatus.Completed));
    }

    function test_approveTask_emitsTaskCompleted() public {
        uint256 id = _taskToSubmitted();
        uint256 payout = REWARD - (REWARD * FEE_BPS) / 10000;

        vm.expectEmit(true, true, false, true);
        emit AgentHands.TaskCompleted(id, worker, REWARD);
        vm.prank(agent);
        hands.approveTask(id);
    }

    function test_approveTask_revertsIfNotAgent() public {
        uint256 id = _taskToSubmitted();
        vm.expectRevert(AgentHands.NotAgent.selector);
        vm.prank(worker);
        hands.approveTask(id);
    }

    function test_approveTask_revertsIfNotSubmitted() public {
        vm.startPrank(agent);
        usdc.approve(address(hands), REWARD);
        uint256 id = hands.createTask(address(usdc), REWARD, deadline, completionDeadline, "T", "D", "L");
        vm.expectRevert(AgentHands.TaskNotSubmitted.selector);
        hands.approveTask(id);
        vm.stopPrank();
    }

    // ─── disputeTask ──────────────────────────────────────────

    function test_disputeTask_setsDisputedStatus() public {
        uint256 id = _taskToSubmitted();
        vm.prank(agent);
        hands.disputeTask(id);
        assertEq(uint8(hands.getTask(id).status), uint8(AgentHands.TaskStatus.Disputed));
    }

    function test_disputeTask_emitsTaskDisputed() public {
        uint256 id = _taskToSubmitted();
        vm.expectEmit(true, true, false, false);
        emit AgentHands.TaskDisputed(id, agent);
        vm.prank(agent);
        hands.disputeTask(id);
    }

    function test_disputeTask_revertsIfNotAgent() public {
        uint256 id = _taskToSubmitted();
        vm.expectRevert(AgentHands.NotAgent.selector);
        vm.prank(worker);
        hands.disputeTask(id);
    }

    // ─── resolveDispute ───────────────────────────────────────

    function test_resolveDispute_workerWins_paysWorker() public {
        uint256 id = _taskToSubmitted();
        vm.prank(agent);
        hands.disputeTask(id);

        uint256 expectedPayout = REWARD - (REWARD * FEE_BPS) / 10000;
        hands.resolveDispute(id, true);

        assertEq(usdc.balanceOf(worker), expectedPayout);
        assertEq(uint8(hands.getTask(id).status), uint8(AgentHands.TaskStatus.Completed));
    }

    function test_resolveDispute_agentWins_refundsAgent() public {
        uint256 id = _taskToSubmitted();
        vm.prank(agent);
        hands.disputeTask(id);

        hands.resolveDispute(id, false);

        assertEq(usdc.balanceOf(agent), 1000e6); // full refund + original balance
        assertEq(uint8(hands.getTask(id).status), uint8(AgentHands.TaskStatus.Cancelled));
    }

    function test_resolveDispute_revertsIfNotOwner() public {
        uint256 id = _taskToSubmitted();
        vm.prank(agent);
        hands.disputeTask(id);

        vm.expectRevert();
        vm.prank(address(0xBAD));
        hands.resolveDispute(id, true);
    }

    function test_resolveDispute_revertsIfNotDisputed() public {
        uint256 id = _taskToSubmitted();
        vm.expectRevert(AgentHands.TaskNotDisputed.selector);
        hands.resolveDispute(id, true);
    }
}
