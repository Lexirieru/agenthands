"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { AGENTHANDS_ADDRESS, USDC_ADDRESSES } from "@/config";
import AgentHandsABI from "@/abi/AgentHands.json";

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

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

export function useUSDCBalance(address: `0x${string}` | undefined, chainId: number) {
  const usdcAddress = USDC_ADDRESSES[chainId];
  return useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!usdcAddress },
  });
}

// ─── Write Hooks ─────────────────────────────────────────

export function useApproveUSDC() {
  return useWriteContract();
}

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
