// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentHands} from "../src/AgentHands.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title  DeployScript
/// @notice Fresh deployment of AgentHands on Celo mainnet (chain ID 42220).
///         Deploys the implementation, wraps it in an ERC-1967 UUPS proxy,
///         initialises with a 2.5% platform fee, and whitelists the first payment token.
/// @dev    Verify after broadcast with:
///           forge verify-contract <IMPL_ADDR> src/AgentHands.sol:AgentHands \
///             --verifier etherscan \
///             --verifier-url "https://api.etherscan.io/v2/api?chainid=42220" \
///             --etherscan-api-key $ETHERSCAN_API_KEY
///
/// Required env vars:
///   PRIVATE_KEY   — deployer private key (becomes proxy owner and initial fee recipient)
///   USDC_ADDRESS  — ERC-20 token to whitelist on deploy
///                   Celo mainnet USDC: 0xcebA9300f2b948710d2653dD7B07f33A8B32118C
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
