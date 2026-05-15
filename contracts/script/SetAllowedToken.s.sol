// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentHands} from "../src/AgentHands.sol";

/// @notice Whitelist or de-list an ERC20 payment token on AgentHands.
///
/// Required env vars:
///   PRIVATE_KEY    — key of the proxy owner
///   PROXY_ADDRESS  — address of the deployed ERC1967 proxy
///   TOKEN_ADDRESS  — ERC20 token to allow or disallow
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
