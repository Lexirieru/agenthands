// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentHands} from "../src/AgentHands.sol";

/// @title  UpgradeScript
/// @notice Upgrades the AgentHands UUPS proxy to a new implementation on Celo mainnet.
///         Deploys a new `AgentHands` implementation and calls `upgradeToAndCall` on
///         the existing ERC-1967 proxy — proxy address and all task data are preserved.
/// @dev    Test the upgrade locally before broadcasting:
///           forge script script/Upgrade.s.sol \
///             --fork-url $CELO_RPC --fork-block-number latest
///         Celo mainnet proxy: 0xADA0466303441102cb16F8eC1594C744d603f746
///
/// Required env vars:
///   PRIVATE_KEY    — private key of the proxy owner
///   PROXY_ADDRESS  — address of the deployed ERC-1967 proxy (AgentHands)
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
