// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentHands} from "../../src/AgentHands.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title  AdminTest
/// @notice Unit tests for AgentHands owner-only admin functions: `setAllowedToken`,
///         `setFee`, `initialize`, and UUPS upgrade authorization on Celo mainnet.
/// @dev    Verifies that non-owners cannot whitelist tokens or change the fee, and that
///         the proxy correctly stores the 250 bps (2.5%) Celo mainnet fee at init.
contract AdminTest is Test {
    AgentHands hands;
    MockERC20 usdc;

    address owner = address(this);
    address feeRecipient = address(0xFEE);
    address stranger = address(0xDEAD);
    address newRecipient = address(0xBEEF);

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        AgentHands impl = new AgentHands();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(impl),
            abi.encodeWithSelector(AgentHands.initialize.selector, feeRecipient, 250)
        );
        hands = AgentHands(address(proxy));
    }

    // ─── setAllowedToken ──────────────────────────────────────

    function test_setAllowedToken_allowsToken() public {
        hands.setAllowedToken(address(usdc), true);
        assertTrue(hands.allowedTokens(address(usdc)));
    }

    function test_setAllowedToken_revokesToken() public {
        hands.setAllowedToken(address(usdc), true);
        hands.setAllowedToken(address(usdc), false);
        assertFalse(hands.allowedTokens(address(usdc)));
    }

    function test_setAllowedToken_emitsTokenAllowed() public {
        vm.expectEmit(false, false, false, true);
        emit AgentHands.TokenAllowed(address(usdc), true);
        hands.setAllowedToken(address(usdc), true);
    }

    function test_setAllowedToken_revertsForNonOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        hands.setAllowedToken(address(usdc), true);
    }

    // ─── setFee ───────────────────────────────────────────────

    function test_setFee_updatesBps() public {
        hands.setFee(500, newRecipient);
        assertEq(hands.platformFeeBps(), 500);
    }

    function test_setFee_updatesRecipient() public {
        hands.setFee(500, newRecipient);
        assertEq(hands.feeRecipient(), newRecipient);
    }

    function test_setFee_revertsForNonOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        hands.setFee(500, newRecipient);
    }

    function test_setFee_zeroFee() public {
        hands.setFee(0, newRecipient);
        assertEq(hands.platformFeeBps(), 0);
    }

    // ─── initialize ───────────────────────────────────────────

    function test_initialize_setsFeeRecipient() public view {
        assertEq(hands.feeRecipient(), feeRecipient);
    }

    function test_initialize_setsFeeBps() public view {
        assertEq(hands.platformFeeBps(), 250);
    }

    function test_initialize_setsOwner() public view {
        assertEq(hands.owner(), owner);
    }

    function test_initialize_revertsOnReinit() public {
        vm.expectRevert();
        hands.initialize(stranger, 100);
    }

    // ─── UUPS upgrade ─────────────────────────────────────────

    function test_upgrade_revertsForNonOwner() public {
        AgentHands newImpl = new AgentHands();
        vm.prank(stranger);
        vm.expectRevert();
        hands.upgradeToAndCall(address(newImpl), "");
    }

    function test_upgrade_ownerCanUpgrade() public {
        AgentHands newImpl = new AgentHands();
        hands.upgradeToAndCall(address(newImpl), "");
    }
}
