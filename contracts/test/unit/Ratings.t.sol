// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentHands} from "../../src/AgentHands.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract RatingsTest is Test {
    AgentHands hands;
    MockERC20 usdc;

    address agent = address(0xA1);
    address worker = address(0xB1);
    address feeRecipient = address(0xFEE);

    uint256 constant REWARD = 100e6;

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
    }

    function _completedTask() internal returns (uint256) {
        uint256 dl = block.timestamp + 1 days;
        uint256 cdl = block.timestamp + 3 days;
        vm.startPrank(agent);
        usdc.approve(address(hands), REWARD);
        uint256 id = hands.createTask(address(usdc), REWARD, dl, cdl, "T", "D", "L");
        vm.stopPrank();
        vm.prank(worker);
        hands.acceptTask(id);
        vm.prank(worker);
        hands.submitProof(id, "ipfs://Qm123");
        vm.prank(agent);
        hands.approveTask(id);
        return id;
    }

    // ─── rateWorker ───────────────────────────────────────────

    function test_rateWorker_storesRating() public {
        uint256 id = _completedTask();
        vm.prank(agent);
        hands.rateWorker(id, 4);

        (uint256 avg, uint256 count) = hands.getWorkerRating(worker);
        assertEq(count, 1);
        assertEq(avg, 4);
    }

    function test_rateWorker_emitsWorkerRated() public {
        uint256 id = _completedTask();
        vm.expectEmit(true, true, false, true);
        emit AgentHands.WorkerRated(id, worker, 5);
        vm.prank(agent);
        hands.rateWorker(id, 5);
    }

    function test_rateWorker_revertsOnInvalidScore() public {
        uint256 id = _completedTask();
        vm.expectRevert(AgentHands.InvalidRating.selector);
        vm.prank(agent);
        hands.rateWorker(id, 6);

        vm.expectRevert(AgentHands.InvalidRating.selector);
        vm.prank(agent);
        hands.rateWorker(id, 0);
    }

    function test_rateWorker_revertsOnDoubleRating() public {
        uint256 id = _completedTask();
        vm.prank(agent);
        hands.rateWorker(id, 3);

        vm.expectRevert(AgentHands.AlreadyRated.selector);
        vm.prank(agent);
        hands.rateWorker(id, 5);
    }

    function test_rateWorker_revertsIfTaskNotCompleted() public {
        uint256 dl = block.timestamp + 1 days;
        uint256 cdl = block.timestamp + 3 days;
        vm.startPrank(agent);
        usdc.approve(address(hands), REWARD);
        uint256 id = hands.createTask(address(usdc), REWARD, dl, cdl, "T", "D", "L");
        vm.expectRevert(AgentHands.TaskNotCompleted.selector);
        hands.rateWorker(id, 3);
        vm.stopPrank();
    }

    // ─── rateAgent ────────────────────────────────────────────

    function test_rateAgent_storesRating() public {
        uint256 id = _completedTask();
        vm.prank(worker);
        hands.rateAgent(id, 5);

        (uint256 avg, uint256 count) = hands.getAgentRating(agent);
        assertEq(count, 1);
        assertEq(avg, 5);
    }

    function test_rateAgent_averageAcrossMultipleTasks() public {
        uint256 id1 = _completedTask();
        uint256 id2 = _completedTask();

        vm.prank(worker);
        hands.rateAgent(id1, 4);
        vm.prank(worker);
        hands.rateAgent(id2, 2);

        (uint256 avg, uint256 count) = hands.getAgentRating(agent);
        assertEq(count, 2);
        assertEq(avg, 3); // floor((4+2)/2)
    }

    function test_rateAgent_revertsOnDoubleRating() public {
        uint256 id = _completedTask();
        vm.prank(worker);
        hands.rateAgent(id, 4);

        vm.expectRevert(AgentHands.AlreadyRated.selector);
        vm.prank(worker);
        hands.rateAgent(id, 5);
    }
}
