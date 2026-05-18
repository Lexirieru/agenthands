// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentHands} from "../../src/AgentHands.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title  CancelExpiredTest
/// @notice Unit tests for `cancelTask` and `claimExpired` — the two fund-recovery
///         paths that ensure no USDC or CELO rewards are ever locked permanently on Celo.
/// @dev    Three `claimExpired` paths are tested:
///           A) Open task past deadline → refund agent.
///           B) Accepted task past completionDeadline → refund agent.
///           C) Submitted task past completionDeadline + 7 days → auto-pay worker.
contract CancelExpiredTest is Test {
    AgentHands hands;
    MockERC20 usdc;

    address owner = address(this);
    address agent = address(0xA1);
    address worker = address(0xB1);
    address feeRecipient = address(0xFEE);

    uint256 constant REWARD = 100e6;
    uint256 deadline;
    uint256 completionDeadline;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        AgentHands impl = new AgentHands();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(impl),
            abi.encodeWithSelector(AgentHands.initialize.selector, feeRecipient, 250)
        );
        hands = AgentHands(address(proxy));
        hands.setAllowedToken(address(usdc), true);
        usdc.mint(agent, 1000e6);
        deadline = block.timestamp + 1 days;
        completionDeadline = block.timestamp + 3 days;
    }

    function _createTask() internal returns (uint256) {
        vm.startPrank(agent);
        usdc.approve(address(hands), REWARD);
        uint256 id = hands.createTask(address(usdc), REWARD, deadline, completionDeadline, "T", "D", "L");
        vm.stopPrank();
        return id;
    }

    // ─── cancelTask ───────────────────────────────────────────

    function test_cancelTask_refundsAgent() public {
        uint256 id = _createTask();
        uint256 before = usdc.balanceOf(agent);

        vm.prank(agent);
        hands.cancelTask(id);

        assertEq(usdc.balanceOf(agent), before + REWARD);
        assertEq(uint8(hands.getTask(id).status), uint8(AgentHands.TaskStatus.Cancelled));
    }

    function test_cancelTask_emitsTaskCancelled() public {
        uint256 id = _createTask();
        vm.expectEmit(true, false, false, false);
        emit AgentHands.TaskCancelled(id);
        vm.prank(agent);
        hands.cancelTask(id);
    }

    function test_cancelTask_revertsIfNotAgent() public {
        uint256 id = _createTask();
        vm.expectRevert(AgentHands.NotAgent.selector);
        vm.prank(worker);
        hands.cancelTask(id);
    }

    function test_cancelTask_revertsIfNotOpen() public {
        uint256 id = _createTask();
        vm.prank(worker);
        hands.acceptTask(id);

        vm.expectRevert(AgentHands.TaskNotOpen.selector);
        vm.prank(agent);
        hands.cancelTask(id);
    }

    // ─── claimExpired: Open task ──────────────────────────────

    function test_claimExpired_openTask_refundsAgent() public {
        uint256 id = _createTask();
        uint256 before = usdc.balanceOf(agent);

        vm.warp(deadline + 1);
        hands.claimExpired(id);

        assertEq(usdc.balanceOf(agent), before + REWARD);
        assertEq(uint8(hands.getTask(id).status), uint8(AgentHands.TaskStatus.Expired));
    }

    // ─── claimExpired: Accepted, worker never submitted ───────

    function test_claimExpired_acceptedNoSubmit_refundsAgent() public {
        uint256 id = _createTask();
        vm.prank(worker);
        hands.acceptTask(id);

        uint256 before = usdc.balanceOf(agent);
        vm.warp(completionDeadline + 1);
        hands.claimExpired(id);

        assertEq(usdc.balanceOf(agent), before + REWARD);
        assertEq(uint8(hands.getTask(id).status), uint8(AgentHands.TaskStatus.Expired));
    }

    // ─── claimExpired: Submitted, agent never reviewed ────────

    function test_claimExpired_submittedNoReview_autoApprovesToWorker() public {
        uint256 id = _createTask();
        vm.prank(worker);
        hands.acceptTask(id);
        vm.prank(worker);
        hands.submitProof(id, "ipfs://Qm123");

        vm.warp(completionDeadline + 7 days + 1);
        hands.claimExpired(id);

        assertGt(usdc.balanceOf(worker), 0);
        assertEq(uint8(hands.getTask(id).status), uint8(AgentHands.TaskStatus.Completed));
    }

    // ─── claimExpired: not yet expired ────────────────────────

    function test_claimExpired_revertsIfNotExpired() public {
        uint256 id = _createTask();
        vm.expectRevert(AgentHands.NotExpired.selector);
        hands.claimExpired(id);
    }
}
