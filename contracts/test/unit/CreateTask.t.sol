// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentHands} from "../../src/AgentHands.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract CreateTaskTest is Test {
    AgentHands hands;
    MockERC20 usdc;

    address owner = address(this);
    address agent = address(0xA1);
    address feeRecipient = address(0xFEE);

    uint256 constant REWARD = 100e6;
    uint256 deadline;
    uint256 completionDeadline;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);

        AgentHands impl = new AgentHands();
        bytes memory initData = abi.encodeWithSelector(
            AgentHands.initialize.selector, feeRecipient, 250
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        hands = AgentHands(address(proxy));

        hands.setAllowedToken(address(usdc), true);
        usdc.mint(agent, 1000e6);

        deadline = block.timestamp + 1 days;
        completionDeadline = block.timestamp + 3 days;
    }

    function test_createTask_success() public {
        vm.startPrank(agent);
        usdc.approve(address(hands), REWARD);
        uint256 taskId = hands.createTask(
            address(usdc), REWARD, deadline, completionDeadline,
            "Title", "Description", "Jakarta"
        );
        vm.stopPrank();

        assertEq(taskId, 1);
        assertEq(hands.taskCount(), 1);

        AgentHands.Task memory t = hands.getTask(1);
        assertEq(t.agent, agent);
        assertEq(t.reward, REWARD);
        assertEq(t.paymentToken, address(usdc));
        assertEq(uint8(t.status), uint8(AgentHands.TaskStatus.Open));
    }

    function test_createTask_transfersRewardToEscrow() public {
        uint256 before = usdc.balanceOf(agent);

        vm.startPrank(agent);
        usdc.approve(address(hands), REWARD);
        hands.createTask(
            address(usdc), REWARD, deadline, completionDeadline,
            "Title", "Description", "Jakarta"
        );
        vm.stopPrank();

        assertEq(usdc.balanceOf(agent), before - REWARD);
        assertEq(usdc.balanceOf(address(hands)), REWARD);
    }

    function test_createTask_emitsTaskCreated() public {
        vm.startPrank(agent);
        usdc.approve(address(hands), REWARD);

        vm.expectEmit(true, true, false, true);
        emit AgentHands.TaskCreated(1, agent, REWARD, address(usdc));

        hands.createTask(
            address(usdc), REWARD, deadline, completionDeadline,
            "Title", "Description", "Jakarta"
        );
        vm.stopPrank();
    }

    function test_createTask_revertsOnDisallowedToken() public {
        MockERC20 other = new MockERC20("Other", "OTH", 18);
        other.mint(agent, 1000e18);

        vm.startPrank(agent);
        other.approve(address(hands), 1e18);
        vm.expectRevert(AgentHands.InvalidToken.selector);
        hands.createTask(
            address(other), 1e18, deadline, completionDeadline,
            "Title", "Description", "Jakarta"
        );
        vm.stopPrank();
    }

    function test_createTask_revertsOnZeroReward() public {
        vm.startPrank(agent);
        usdc.approve(address(hands), REWARD);
        vm.expectRevert(AgentHands.InvalidReward.selector);
        hands.createTask(
            address(usdc), 0, deadline, completionDeadline,
            "Title", "Description", "Jakarta"
        );
        vm.stopPrank();
    }

    function test_createTask_revertsOnPastDeadline() public {
        vm.startPrank(agent);
        usdc.approve(address(hands), REWARD);
        vm.expectRevert(AgentHands.InvalidDeadline.selector);
        hands.createTask(
            address(usdc), REWARD, block.timestamp - 1, completionDeadline,
            "Title", "Description", "Jakarta"
        );
        vm.stopPrank();
    }

    function test_createTask_revertsWhenCompletionBeforeDeadline() public {
        vm.startPrank(agent);
        usdc.approve(address(hands), REWARD);
        vm.expectRevert(AgentHands.InvalidDeadline.selector);
        hands.createTask(
            address(usdc), REWARD, deadline, deadline,
            "Title", "Description", "Jakarta"
        );
        vm.stopPrank();
    }

    function test_createTask_incrementsTaskCount() public {
        vm.startPrank(agent);
        usdc.approve(address(hands), REWARD * 3);
        hands.createTask(address(usdc), REWARD, deadline, completionDeadline, "A", "B", "C");
        hands.createTask(address(usdc), REWARD, deadline, completionDeadline, "A", "B", "C");
        hands.createTask(address(usdc), REWARD, deadline, completionDeadline, "A", "B", "C");
        vm.stopPrank();

        assertEq(hands.taskCount(), 3);
    }
}
