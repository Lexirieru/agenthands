// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentHands} from "../src/AgentHands.sol";

/// @title  SetFeeScript
/// @notice Updates the platform fee rate and recipient on the AgentHands proxy.
/// @dev    Current Celo mainnet fee: 250 bps (2.5%). Fee change applies to future
///         payouts only — tasks already in escrow are not retroactively affected.
///         A `FeeUpdated` event is emitted on success for off-chain monitoring.
///
/// Required env vars:
///   PRIVATE_KEY      — private key of the proxy owner
///   PROXY_ADDRESS    — AgentHands proxy address (0xADA0466303441102cb16F8eC1594C744d603f746)
///   FEE_BPS          — new fee in basis points (e.g. 250 = 2.5%)
///   FEE_RECIPIENT    — address that receives platform fees on Celo mainnet
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
