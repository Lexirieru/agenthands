// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentHands} from "../src/AgentHands.sol";

/// @title  SetAllowedTokenScript
/// @notice Whitelist or de-list an ERC-20 payment token on the AgentHands proxy.
/// @dev    Celo mainnet token addresses:
///           USDC  — 0xcebA9300f2b948710d2653dD7B07f33A8B32118C
///           CELO  — 0x471EcE3750Da237f93B8E339c536989b8978a438
///         Example (allow CELO ERC-20):
///           TOKEN_ADDRESS=0x471EcE3750Da237f93B8E339c536989b8978a438 \
///           TOKEN_ALLOWED=true forge script script/SetAllowedToken.s.sol \
///             --rpc-url $CELO_RPC --broadcast --slow
///
/// Required env vars:
///   PRIVATE_KEY    — private key of the proxy owner
///   PROXY_ADDRESS  — AgentHands proxy address (0xADA0466303441102cb16F8eC1594C744d603f746)
///   TOKEN_ADDRESS  — ERC-20 token to allow or disallow
///   TOKEN_ALLOWED  — "true" to allow, "false" to disallow
contract SetAllowedTokenScript is Script {
    function run() external {
        uint256 ownerKey = vm.envUint("PRIVATE_KEY");
        address proxy = vm.envAddress("PROXY_ADDRESS");
        address token = vm.envAddress("TOKEN_ADDRESS");
        bool allowed = vm.envBool("TOKEN_ALLOWED");

        console.log("Proxy:  ", proxy);
        console.log("Token:  ", token);
        console.log("Allowed:", allowed);

        vm.broadcast(ownerKey);
        AgentHands(proxy).setAllowedToken(token, allowed);

        console.log("Done.");
    }
}
