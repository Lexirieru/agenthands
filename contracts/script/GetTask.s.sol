// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentHands} from "../src/AgentHands.sol";

/// @notice Read and print a task struct from an AgentHands proxy (no broadcast needed).
///
/// Required env vars:
///   PROXY_ADDRESS  — address of the deployed ERC1967 proxy
///   TASK_ID        — numeric task ID to inspect
contract GetTaskScript is Script {
    function run() external view {
        address proxy = vm.envAddress("PROXY_ADDRESS");
        uint256 taskId = vm.envUint("TASK_ID");

        AgentHands.Task memory t = AgentHands(proxy).getTask(taskId);

        string[7] memory statuses = ["Open", "Accepted", "Submitted", "Completed", "Disputed", "Cancelled", "Expired"];

        console.log("=== Task", taskId, "===");
        console.log("Status:    ", statuses[uint256(t.status)]);
        console.log("Agent:     ", t.agent);
        console.log("Worker:    ", t.worker);
        console.log("Token:     ", t.paymentToken);
        console.log("Reward:    ", t.reward);
        console.log("Deadline:  ", t.deadline);
        console.log("CmpDeadln: ", t.completionDeadline);
        console.log("Title:     ", t.title);
        console.log("ProofCID:  ", t.proofCID);
    }
}
