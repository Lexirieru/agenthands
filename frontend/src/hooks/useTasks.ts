"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPublicClient, http, fallback } from "viem";
import { useCallback } from "react";
import { AGENTHANDS_ADDRESS, CHAIN } from "@/config";
import AgentHandsABI from "@/abi/AgentHands.json";
import type { TaskData } from "@/types/task";

// Prefer transports defined on the wagmi CHAIN (so mainnet switch "just works"
// by changing CHAIN in @/config), then fall back to the official Forno
// endpoint for whichever chain is active.
const fallbackRpc =
  CHAIN.id === 11142220
    ? "https://forno.celo-sepolia.celo-testnet.org"
    : "https://forno.celo.org";

const publicClient = createPublicClient({
  chain: CHAIN,
  transport: fallback([
    http(CHAIN.rpcUrls.default.http[0]),
    http(fallbackRpc),
  ]),
});

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
    .filter((t): t is TaskData => t !== null);
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

  return { invalidateAll, invalidateList, invalidateDetail };
}
