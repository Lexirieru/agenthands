"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPublicClient, http, fallback } from "viem";
import { useCallback } from "react";
import { AGENTHANDS_ADDRESS, CHAIN } from "@/config";
import AgentHandsABI from "@/abi/AgentHands.json";
import type { TaskData } from "@/types/task";

// Fall back to the official Forno endpoint if the wagmi CHAIN's transport
// is unreachable. AgentHands runs on Celo mainnet.
const fallbackRpc = "https://forno.celo.org";

const publicClient = createPublicClient({
  chain: CHAIN,
  transport: fallback([
    http(CHAIN.rpcUrls.default.http[0]),
    http(fallbackRpc),
  ]),
});

// Tasks we don't want to show on the public feed / dashboard. Internal smoke
// tests, demos, things we'd rather not advertise. Direct URLs still work
// (useTaskDetail doesn't filter), so anyone with the link can still see them.
const HIDDEN_TASK_IDS = new Set<string>(["1", "2"]);

export const taskQueryKeys = {
  all: ["tasks"] as const,
  list: () => [...taskQueryKeys.all, "list"] as const,
  detail: (id: string | bigint) => [...taskQueryKeys.all, "detail", id.toString()] as const,
  count: () => [...taskQueryKeys.all, "count"] as const,
};

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

export function useAllTasks() {
  return useQuery({
    queryKey: taskQueryKeys.list(),
    queryFn: fetchAllTasks,
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    staleTime: 4000,
  });
}

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

  // Optimistic cache patch — used on tx success so the UI reflects the new
  // state instantly instead of waiting up to 4-6 s for the RPC node to catch
  // up + the event watcher to fire. Patches BOTH the single-task detail and
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
