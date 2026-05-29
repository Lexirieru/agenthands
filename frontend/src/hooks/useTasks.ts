"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPublicClient, http, fallback } from "viem";
import { useCallback } from "react";
import { AGENTHANDS_ADDRESS, CHAIN } from "@/config";
import AgentHandsABI from "@/abi/AgentHands.json";
import type { TaskData } from "@/types/task";

/**
 * Task data layer for AgentHands on Celo mainnet.
 *
 * Uses a module-level `publicClient` (viem) with a Forno fallback so reads
 * work even when the primary RPC is rate-limited. All task fetching goes
 * through TanStack Query so components share a single cache with automatic
 * refetching every 8 s (list) / 6 s (detail).
 *
 * `HIDDEN_TASK_IDS` filters smoke-test / demo tasks from the public feed;
 * direct `/tasks/:id` URLs still resolve — only `useAllTasks` hides them.
 *
 * Key exports:
 * - `useAllTasks` — viem multicall over all tasks, filtered + cached
 * - `useTaskDetail` — single-task poller, no HIDDEN_TASK_IDS filter
 * - `useInvalidateTasks` — imperative cache invalidation + optimistic patch
 * - `taskQueryKeys` — typed key factory for query coordination
 */
/** Official Celo Foundation Forno RPC — used as the secondary fallback transport when the primary node is rate-limited or unreachable. */
const fallbackRpc = "https://forno.celo.org";

/**
 * Module-level viem public client for Celo mainnet with automatic fallback to Forno.
 * Shared across all fetch functions so every hook in this module uses the same transport.
 */
const publicClient = createPublicClient({
  chain: CHAIN,
  transport: fallback([
    http(CHAIN.rpcUrls.default.http[0]),
    http(fallbackRpc),
  ]),
});

// Tasks we don't want to show on the public feed / dashboard. Internal smoke-
// test tasks, launch demos, and seed data we'd rather not advertise on Celo mainnet. Direct URLs still work
// (useTaskDetail doesn't filter), so anyone with the link can still see them.
/** Task IDs excluded from the public Celo feed — smoke-test seeds; direct `/tasks/:id` links still resolve. */
const HIDDEN_TASK_IDS = new Set<string>(["1", "2"]);

/** @since 1.0.0 Typed TanStack Query key factory — keeps all cache keys in sync across hooks. */
export const taskQueryKeys = {
  all: ["tasks"] as const,
  list: () => [...taskQueryKeys.all, "list"] as const,
  /** @param id Task ID as string or bigint — normalised to string for stable cache keying on Celo. */
  detail: (id: string | bigint) => [...taskQueryKeys.all, "detail", id.toString()] as const,
  /** Cache key for `taskCount` reads — used to coordinate invalidation after write transactions. */
  count: () => [...taskQueryKeys.all, "count"] as const,
};

/**
 * Fetch all tasks ever posted to AgentHands via viem multicall.
 * @since 1.0.0
 * Calls `taskCount` then batches `getTask(i)` for every ID in one multicall.
 * Results that failed on-chain or whose IDs are in `HIDDEN_TASK_IDS` are omitted.
 */
async function fetchAllTasks(): Promise<TaskData[]> {
  const count = (await publicClient.readContract({
    address: AGENTHANDS_ADDRESS,
    abi: AgentHandsABI,
    functionName: "taskCount",
  })) as bigint;

  const total = Number(count);
  if (total === 0) return [];

  const contracts = Array.from({ length: total }, (_, i) => ({
    address: AGENTHANDS_ADDRESS,
    abi: AgentHandsABI,
    functionName: "getTask",
    args: [BigInt(i + 1)],
  }));

  const results = await publicClient.multicall({
    // @ts-expect-error wagmi multicall typings conflict with viem
    contracts,
    allowFailure: true,
  });

  return results
    .map((res, i) => {
      if (res.status !== "success") return null;
      const task = res.result as TaskData;
      return {
        ...task,
        id: BigInt(i + 1),
        status: Number(task.status),
      } as TaskData;
    })
    .filter((t): t is TaskData => t !== null && !HIDDEN_TASK_IDS.has(t.id.toString()));
}

/**
 * Fetch a single task by its on-chain `uint256` ID from Celo mainnet.
 * @since 1.0.0
 * Returns `null` if the contract call reverts (e.g. ID out of range or zero).
 * @param taskId 1-based task ID assigned by `createTask` on the AgentHands Celo contract.
 */
async function fetchTask(taskId: bigint): Promise<TaskData | null> {
  try {
    const result = await publicClient.readContract({
      address: AGENTHANDS_ADDRESS,
      abi: AgentHandsABI,
      functionName: "getTask",
      args: [taskId],
    });
    return result as unknown as TaskData;
  } catch {
    return null;
  }
}

/**
 * TanStack Query hook that returns every non-hidden task on Celo mainnet.
 * Refetches every 8 s and on window focus; stale time is 4 s so multiple
 * components share the same in-flight request.
 *
 * @since 1.0.0
 * @returns TanStack Query result with `data: TaskData[]` (empty array while loading),
 *          plus standard `isLoading`, `isError`, and `refetch` fields.
 */
export function useAllTasks() {
  return useQuery({
    queryKey: taskQueryKeys.list(),
    queryFn: fetchAllTasks,
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    staleTime: 4000,
  });
}

/**
 * TanStack Query hook for a single Celo task. Polling is set to 6 s to keep
 * the task detail page up to date as workers interact with the contract.
 * Does NOT filter HIDDEN_TASK_IDS — direct links always resolve.
 *
 * @since 1.0.0
 * @param taskId - Task ID to load; pass `undefined` to skip fetching.
 * @returns      TanStack Query result with `data: TaskData | null` (null on
 *               revert or missing ID) and standard loading/error state.
 */
export function useTaskDetail(taskId: bigint | undefined) {
  return useQuery({
    queryKey: taskId ? taskQueryKeys.detail(taskId) : ["tasks", "detail", "none"],
    queryFn: () => (taskId ? fetchTask(taskId) : Promise.resolve(null)),
    enabled: taskId !== undefined,
    refetchInterval: 6000,
    refetchOnWindowFocus: true,
    staleTime: 3000,
  });
}

/**
 * Returns imperative cache helpers for the TanStack Query task cache on Celo.
 * @since 1.0.0
 * Use `invalidateList` after creating a task, `invalidateDetail` after accepting
 * or completing one, and `patchDetail` for optimistic UI updates on Celo tx success.
 */
export function useInvalidateTasks() {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: taskQueryKeys.all });
  }, [queryClient]);

  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: taskQueryKeys.list() });
  }, [queryClient]);

  const invalidateDetail = useCallback(
    (taskId: bigint | string) => {
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(taskId) });
    },
    [queryClient]
  );

  // Optimistic cache patch — used on Celo tx success so the UI reflects the new
  // state instantly instead of waiting up to 4–6 s for the Forno RPC node to
  // catch up and the event watcher to fire. Patches BOTH the single-task detail and
  // the list cache so the feed page is in sync if the user navigates back.
  const patchDetail = useCallback(
    (taskId: bigint | string, patch: Partial<TaskData>) => {
      const idStr = taskId.toString();
      queryClient.setQueryData<TaskData | null>(
        taskQueryKeys.detail(taskId),
        (old) => (old ? { ...old, ...patch } : old)
      );
      queryClient.setQueryData<TaskData[] | undefined>(
        taskQueryKeys.list(),
        (old) =>
          Array.isArray(old)
            ? old.map((t) =>
                t.id?.toString() === idStr ? { ...t, ...patch } : t
              )
            : old
      );
    },
    [queryClient]
  );

  return { invalidateAll, invalidateList, invalidateDetail, patchDetail };
}
