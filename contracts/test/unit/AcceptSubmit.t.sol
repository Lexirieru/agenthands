// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentHands} from "../../src/AgentHands.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title  AcceptSubmitTest
/// @notice Unit tests for `acceptTask` and `submitProof` — the two steps where a human
///         worker on Celo commits to a task and uploads their IPFS completion proof.
/// @dev    In production the worker calls these via a Celo wallet (MiniPay/Valora) with
///         CIP-64 gas abstraction. Tests here use a plain EOA to cover all revert paths.
contract AcceptSubmitTest is Test {
    AgentHands hands;
    MockERC20 usdc;

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

    // ─── acceptTask ───────────────────────────────────────────

    function test_acceptTask_success() public {
        uint256 id = _createTask();
        vm.prank(worker);
        hands.acceptTask(id);

        AgentHands.Task memory t = hands.getTask(id);
        assertEq(t.worker, worker);
        assertEq(uint8(t.status), uint8(AgentHands.TaskStatus.Accepted));
    }

    function test_acceptTask_emitsTaskAccepted() public {
        uint256 id = _createTask();
        vm.expectEmit(true, true, false, false);
        emit AgentHands.TaskAccepted(id, worker);
        vm.prank(worker);
        hands.acceptTask(id);
    }

    function test_acceptTask_revertsIfNotOpen() public {
        uint256 id = _createTask();
        vm.prank(worker);
        hands.acceptTask(id);

        vm.expectRevert(AgentHands.TaskNotOpen.selector);
        vm.prank(address(0xC1));
        hands.acceptTask(id);
    }

    function test_acceptTask_revertsAfterDeadline() public {
        uint256 id = _createTask();
        vm.warp(deadline + 1);
        vm.expectRevert(AgentHands.DeadlinePassed.selector);
        vm.prank(worker);
        hands.acceptTask(id);
    }

    // ─── submitProof ──────────────────────────────────────────

    function test_submitProof_success() public {
        uint256 id = _createTask();
        vm.prank(worker);
        hands.acceptTask(id);

        vm.prank(worker);
        hands.submitProof(id, "ipfs://QmTestCID");

        AgentHands.Task memory t = hands.getTask(id);
        assertEq(t.proofCID, "ipfs://QmTestCID");
        assertEq(uint8(t.status), uint8(AgentHands.TaskStatus.Submitted));
    }

    function test_submitProof_emitsProofSubmitted() public {
        uint256 id = _createTask();
        vm.prank(worker);
        hands.acceptTask(id);

        vm.expectEmit(true, false, false, true);
        emit AgentHands.ProofSubmitted(id, "ipfs://QmTestCID");
        vm.prank(worker);
        hands.submitProof(id, "ipfs://QmTestCID");
    }

    function test_submitProof_revertsIfNotWorker() public {
        uint256 id = _createTask();
        vm.prank(worker);
        hands.acceptTask(id);

        vm.expectRevert(AgentHands.NotWorker.selector);
        vm.prank(address(0xC1));
        hands.submitProof(id, "ipfs://QmTestCID");
    }

    function test_submitProof_revertsIfNotAccepted() public {
        uint256 id = _createTask();
        vm.expectRevert(AgentHands.NotWorker.selector);
        vm.prank(worker);
        hands.submitProof(id, "ipfs://QmTestCID");
    }

    function test_submitProof_revertsAfterCompletionDeadline() public {
        uint256 id = _createTask();
        vm.prank(worker);
        hands.acceptTask(id);

        vm.warp(completionDeadline + 1);
        vm.expectRevert(AgentHands.CompletionDeadlinePassed.selector);
        vm.prank(worker);
        hands.submitProof(id, "ipfs://QmTestCID");
    }
}
