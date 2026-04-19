"use client";

import { useEffect } from "react";
import { createPublicClient, http, fallback, parseAbi } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { AGENTHANDS_ADDRESS, CHAIN } from "@/config";
import { useInvalidateTasks } from "@/hooks/useTasks";

const watchEvents = parseAbi([
  "event TaskCreated(uint256 indexed taskId, address indexed agent, uint256 reward)",
  "event TaskAccepted(uint256 indexed taskId, address indexed worker)",
  "event ProofSubmitted(uint256 indexed taskId, string proofCID)",
  "event TaskCompleted(uint256 indexed taskId, address indexed worker, uint256 workerAmount)",
  "event TaskAutoCompleted(uint256 indexed taskId, address indexed worker, uint256 workerAmount)",
  "event TaskDisputed(uint256 indexed taskId)",
  "event TaskCancelled(uint256 indexed taskId)",
  "event TaskExpired(uint256 indexed taskId)",
  "event DisputeResolved(uint256 indexed taskId, uint8 resolution)",
  "event WorkerRated(uint256 indexed taskId, address indexed worker, uint8 rating)",
  "event AgentRated(uint256 indexed taskId, address indexed agent, uint8 rating)",
]);

let watcherStarted = false;

/**
 * Starts a single global watcher (idempotent) that listens for AgentHands
 * contract events and invalidates the tasks queries when something changes.
 * This makes the UI update in near real-time without waiting for the
 * React Query polling interval.
 */
export function useTaskEventWatcher() {
  const { invalidateAll } = useInvalidateTasks();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (watcherStarted) return;
    watcherStarted = true;

    const client = createPublicClient({
      chain: CHAIN,
      transport: fallback([
        http("https://alfajores-forno.celo-testnet.org"),
        http("https://forno.celo-sepolia.celo-testnet.org"),
        http("https://rpc.ankr.com/celo_alfajores"),
      ]),
    });

    const unwatch = client.watchContractEvent({
      address: AGENTHANDS_ADDRESS,
      abi: watchEvents,
      onLogs: () => {
        invalidateAll();
        queryClient.invalidateQueries({ queryKey: ["readContract"] });
        queryClient.invalidateQueries({ queryKey: ["readContracts"] });
      },
      onError: () => {
        // Ignored: we still have the polling interval as a safety net.
      },
      pollingInterval: 4000,
    });

    return () => {
      unwatch();
      watcherStarted = false;
    };
  }, [invalidateAll, queryClient]);
}
