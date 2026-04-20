"use client";

import { useEffect } from "react";
import { createPublicClient, http, fallback, parseAbi } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { AGENTHANDS_ADDRESS, CHAIN } from "@/config";
import { useInvalidateTasks } from "@/hooks/useTasks";

// Signatures MUST match contracts/src/AgentHands.sol exactly — viem matches
// by topic hash, which is derived from `event Name(types)` so parameter names
// don't matter but types + order do.
const watchEvents = parseAbi([
  "event TaskCreated(uint256 indexed taskId, address indexed agent, uint256 reward, address paymentToken)",
  "event TaskAccepted(uint256 indexed taskId, address indexed worker)",
  "event ProofSubmitted(uint256 indexed taskId, string proofCID)",
  "event TaskCompleted(uint256 indexed taskId, address indexed worker, uint256 payout)",
  "event TaskAutoCompleted(uint256 indexed taskId, address indexed worker, uint256 payout)",
  "event TaskDisputed(uint256 indexed taskId, address indexed agent)",
  "event TaskCancelled(uint256 indexed taskId)",
  "event TaskExpired(uint256 indexed taskId, address indexed agent, uint256 refund)",
  "event DisputeResolved(uint256 indexed taskId, bool workerWins)",
  "event WorkerRated(uint256 indexed taskId, address indexed worker, uint8 score)",
  "event AgentRated(uint256 indexed taskId, address indexed agent, uint8 score)",
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

    const fallbackRpc =
      CHAIN.id === 11142220
        ? "https://forno.celo-sepolia.celo-testnet.org"
        : "https://forno.celo.org";

    const client = createPublicClient({
      chain: CHAIN,
      transport: fallback([
        http(CHAIN.rpcUrls.default.http[0]),
        http(fallbackRpc),
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
