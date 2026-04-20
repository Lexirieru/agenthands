"use client";

import { useBalance, useReadContract, useWriteContract } from "wagmi";
import { AGENTHANDS_ADDRESS, CHAIN } from "@/config";
import AgentHandsABI from "@/abi/AgentHands.json";

// ─── Read Hooks ──────────────────────────────────────────

export function useTaskCount() {
  return useReadContract({
    address: AGENTHANDS_ADDRESS,
    abi: AgentHandsABI,
    functionName: "taskCount",
  });
}

export function useTask(taskId: bigint) {
  return useReadContract({
    address: AGENTHANDS_ADDRESS,
    abi: AgentHandsABI,
    functionName: "getTask",
    args: [taskId],
  });
}

export function useWorkerRating(worker: `0x${string}`) {
  return useReadContract({
    address: AGENTHANDS_ADDRESS,
    abi: AgentHandsABI,
    functionName: "getWorkerRating",
    args: [worker],
  });
}

export function useAgentRating(agent: `0x${string}`) {
  return useReadContract({
    address: AGENTHANDS_ADDRESS,
    abi: AgentHandsABI,
    functionName: "getAgentRating",
    args: [agent],
  });
}

/// Native CELO balance (replaces old useUSDCBalance).
export function useCeloBalance(address: `0x${string}` | undefined) {
  return useBalance({
    address,
    chainId: CHAIN.id,
    query: {
      enabled: !!address,
      refetchInterval: 8000,
      refetchOnWindowFocus: true,
      staleTime: 4000,
    },
  });
}

// ─── Write Hooks ─────────────────────────────────────────

export function useCreateTask() {
  return useWriteContract();
}

export function useAcceptTask() {
  return useWriteContract();
}

export function useSubmitProof() {
  return useWriteContract();
}

export function useApproveTask() {
  return useWriteContract();
}

export function useDisputeTask() {
  return useWriteContract();
}

export function useCancelTask() {
  return useWriteContract();
}

export function useRateWorker() {
  return useWriteContract();
}

export function useRateAgent() {
  return useWriteContract();
}
