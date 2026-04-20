// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentHands} from "../src/AgentHands.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @notice Fresh deployment of AgentHands (USDC/ERC20 escrow, UUPS upgradeable).
///
/// Required env vars:
///   PRIVATE_KEY   — key of the deployer (becomes proxy owner + fee recipient)
///   USDC_ADDRESS  — ERC20 token to whitelist on deploy (e.g. USDC on Celo Sepolia)
contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address usdc = vm.envAddress("USDC_ADDRESS");

        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);
        console.log("USDC:   ", usdc);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy implementation
        AgentHands impl = new AgentHands();
        console.log("Implementation:", address(impl));

        // 2. Deploy proxy with initialize
        bytes memory initData = abi.encodeWithSelector(
            AgentHands.initialize.selector,
            deployer, // feeRecipient
            250       // 2.5% platform fee (bps)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        console.log("Proxy (AgentHands):", address(proxy));

        // 3. Whitelist USDC as an allowed payment token
        AgentHands(address(proxy)).setAllowedToken(usdc, true);
        console.log("Allowed USDC as payment token");

        vm.stopBroadcast();

        console.log("--- DEPLOYMENT COMPLETE ---");
    }
}
