// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentHands} from "../../src/AgentHands.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ViewHelpersTest is Test {
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

    // ─── version ──────────────────────────────────────────────

    function test_version_returns110() public view {
        assertEq(hands.version(), "1.1.0");
    }

    // ─── isTokenAllowed ───────────────────────────────────────

    function test_isTokenAllowed_trueForWhitelisted() public view {
        assertTrue(hands.isTokenAllowed(address(usdc)));
    }

    function test_isTokenAllowed_falseForRandom() public view {
        assertFalse(hands.isTokenAllowed(address(0xDEAD)));
    }

    // ─── FeeUpdated event ─────────────────────────────────────

    function test_setFee_emitsFeeUpdated() public {
        vm.expectEmit(false, false, false, true);
        emit AgentHands.FeeUpdated(500, address(0xBEEF));
        hands.setFee(500, address(0xBEEF));
    }

    // ─── getTasksByStatus ─────────────────────────────────────

    function _createTask() internal returns (uint256) {
        vm.startPrank(agent);
        usdc.approve(address(hands), REWARD);
        uint256 id = hands.createTask(
            address(usdc), REWARD,
            block.timestamp + 1 days,
            block.timestamp + 3 days,
            "T", "D", "L"
        );
        vm.stopPrank();
        return id;
    }

    function test_getTasksByStatus_emptyWhenNoTasks() public view {
        uint256[] memory ids = hands.getTasksByStatus(AgentHands.TaskStatus.Open);
        assertEq(ids.length, 0);
    }

    function test_getTasksByStatus_returnsOpenTasks() public {
        uint256 id1 = _createTask();
        uint256 id2 = _createTask();

        uint256[] memory ids = hands.getTasksByStatus(AgentHands.TaskStatus.Open);
        assertEq(ids.length, 2);
        assertEq(ids[0], id1);
        assertEq(ids[1], id2);
    }

    function test_getTasksByStatus_filtersCorrectly() public {
        uint256 id1 = _createTask();
        _createTask(); // stays Open

        vm.prank(worker);
        hands.acceptTask(id1);

        uint256[] memory open = hands.getTasksByStatus(AgentHands.TaskStatus.Open);
        uint256[] memory accepted = hands.getTasksByStatus(AgentHands.TaskStatus.Accepted);

        assertEq(open.length, 1);
        assertEq(accepted.length, 1);
        assertEq(accepted[0], id1);
    }
}
