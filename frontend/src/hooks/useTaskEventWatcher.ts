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

/** Module-level flag ensuring only one Celo log-subscription is active regardless of React re-mounts. */
let watcherStarted = false;

/**
 * Start a single global watcher (idempotent via `watcherStarted` flag) that
 * subscribes to all 11 AgentHands contract events on Celo mainnet and
 * invalidates the TanStack Query cache whenever a log is received.
 *
 * Monitored events: TaskCreated, TaskAccepted, ProofSubmitted, TaskCompleted,
 * TaskAutoCompleted, TaskDisputed, TaskCancelled, TaskExpired, DisputeResolved,
 * WorkerRated, AgentRated.
 *
 * Each event signature must exactly match the Solidity declaration in
 * `contracts/src/AgentHands.sol` — viem derives the topic hash from the
 * canonical ABI string, so parameter names are irrelevant but types and order
 * are not. Any mismatch silently produces zero matches.
 *
 * Celo produces a new block roughly every 5 s (EVM slot time), so `pollingInterval`
 * is set to 4 000 ms to catch each new block within one interval without excessive
 * Forno RPC load. The watcher uses a Forno fallback RPC (`https://forno.celo.org`)
 * identical to `useTasks` so logs still arrive when the primary node is
 * rate-limited.
 *
 * On each log batch, the handler invalidates the full tasks query key tree
 * (list + detail) plus the wagmi `readContract` / `readContracts` caches
 * so the header balance pill refreshes alongside the task feed.
 *
 * Errors are silently discarded — the polling-based refetch in `useAllTasks`
 * (8 s) serves as a safety net if the watcher stalls or the WebSocket drops.
 *
 * @since 1.0.0
 * @see useAllTasks — 8 s polling fallback that covers watcher gaps
 */
export function useTaskEventWatcher() {
  const { invalidateAll } = useInvalidateTasks();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (watcherStarted) return;
    watcherStarted = true;

    const fallbackRpc = "https://forno.celo.org";

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
