// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentHands} from "../src/AgentHands.sol";

/// @notice Update the platform fee rate and recipient on AgentHands.
///
/// Required env vars:
///   PRIVATE_KEY      — key of the proxy owner
///   PROXY_ADDRESS    — address of the deployed ERC1967 proxy
///   FEE_BPS          — new fee in basis points (e.g. 250 = 2.5%)
///   FEE_RECIPIENT    — address that receives platform fees
contract SetFeeScript is Script {
    function run() external {
        uint256 ownerKey = vm.envUint("PRIVATE_KEY");
        address proxy = vm.envAddress("PROXY_ADDRESS");
        uint256 feeBps = vm.envUint("FEE_BPS");
        address recipient = vm.envAddress("FEE_RECIPIENT");

        console.log("Proxy:        ", proxy);
        console.log("New fee (bps):", feeBps);
        console.log("Recipient:    ", recipient);

        vm.broadcast(ownerKey);
        AgentHands(proxy).setFee(feeBps, recipient);

        console.log("Done.");
    }
}
