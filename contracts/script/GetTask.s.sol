// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentHands} from "../src/AgentHands.sol";

/// @title  GetTaskScript
/// @notice Reads and pretty-prints a single task struct from the AgentHands proxy.
///         No broadcast — this is a pure read-only script (marked `view`).
/// @dev    Useful for quickly inspecting on-chain task state on Celo mainnet
///         without needing a frontend or Celoscan. All fields are logged via `console.log`.
///         Example usage (task 1 on Celo mainnet):
///           PROXY_ADDRESS=0xADA0466303441102cb16F8eC1594C744d603f746 \
///           TASK_ID=1 forge script script/GetTask.s.sol --rpc-url $CELO_RPC
///
/// Required env vars:
///   PROXY_ADDRESS  — AgentHands proxy address (chain ID 42220)
///   TASK_ID        — numeric task ID to inspect (1-indexed)
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
