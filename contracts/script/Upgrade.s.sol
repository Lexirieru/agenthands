// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentHands} from "../src/AgentHands.sol";

/// @notice Upgrade the AgentHands UUPS proxy to a new implementation.
///
/// Required env vars:
///   PRIVATE_KEY    — key of the proxy owner
///   PROXY_ADDRESS  — address of the deployed ERC1967 proxy
contract UpgradeScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address proxy = vm.envAddress("PROXY_ADDRESS");

        vm.startBroadcast(deployerKey);

        AgentHands newImpl = new AgentHands();
        console.log("New implementation:", address(newImpl));

        AgentHands(proxy).upgradeToAndCall(address(newImpl), "");
        console.log("Proxy upgraded:", proxy);

        vm.stopBroadcast();
    }
}
