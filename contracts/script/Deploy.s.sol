// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentHands} from "../src/AgentHands.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy implementation
        AgentHands impl = new AgentHands();
        console.log("Implementation:", address(impl));

        // 2. Deploy proxy with initialize
        bytes memory initData = abi.encodeWithSelector(
            AgentHands.initialize.selector,
            deployer,   // feeRecipient = deployer for now
            250          // 2.5% platform fee
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        console.log("Proxy (AgentHands):", address(proxy));

        // 3. Set allowed tokens
        AgentHands hands = AgentHands(address(proxy));
        
        // USDC on Base Sepolia
        address usdc = vm.envOr("USDC_ADDRESS", address(0));
        if (usdc != address(0)) {
            hands.setAllowedToken(usdc, true);
            console.log("Allowed USDC:", usdc);
        }

        vm.stopBroadcast();

        console.log("--- DEPLOYMENT COMPLETE ---");
    }
}
