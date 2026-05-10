"use client";

import { useMemo } from "react";
import { useReadContracts, useReadContract, useWriteContract } from "wagmi";
import {
  AGENTHANDS_ADDRESS,
  USDC_ADDRESS,
  STABLECOINS,
  CELO_TOKEN_ADDRESS,
  CELO_TOKEN_DECIMALS,
} from "@/config";
import { useCeloUsdPrice } from "@/hooks/useCeloUsdPrice";
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

export function useUSDCBalance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 8000,
      refetchOnWindowFocus: true,
      staleTime: 4000,
    },
  });
}

export type StablecoinBalance = {
  symbol: (typeof STABLECOINS)[number]["symbol"];
  address: `0x${string}`;
  decimals: number;
  logo: string | null;
  raw: bigint;
  /** Floating-point dollars, normalized for the per-token decimals. */
  dollars: number;
};

export type RewardTokenBalance = StablecoinBalance & {
  /** Volatile reward tokens (e.g. CELO) need a price feed to convert to $. */
  isVolatile: boolean;
};

/**
 * Multicall the wallet's balances for all whitelisted stablecoins
 * (USDC, USDT, USDm) in one request. Returns the per-token balances
 * and the dollar-denominated total for the header pill / dashboard
 * "Dollars" card.
 *
 * When `includeCelo` is true (desktop only — mobile/MiniPay surface
 * stays stablecoin-only by design), CELO balance is also fetched and
 * priced via the Chainlink CELO/USD feed so it can fold into the same
 * "Total dollars" number.
 */
export function useStablecoinBalances(
  address: `0x${string}` | undefined,
  options?: { includeCelo?: boolean }
) {
  const includeCelo = !!options?.includeCelo;

  const result = useReadContracts({
    contracts: STABLECOINS.map((s) => ({
      address: s.address,
      abi: ERC20_ABI,
      functionName: "balanceOf" as const,
      args: address ? ([address] as const) : undefined,
    })),
    query: {
      enabled: !!address,
      refetchInterval: 8000,
      refetchOnWindowFocus: true,
      staleTime: 4000,
    },
  });

  // CELO ERC-20 facade balance — only fetched when the caller opts in.
  const celoBalance = useReadContract({
    address: CELO_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && includeCelo,
      refetchInterval: 8000,
      refetchOnWindowFocus: true,
      staleTime: 4000,
    },
  });

  const celoUsd = useCeloUsdPrice(includeCelo);

  const balances: RewardTokenBalance[] = useMemo(() => {
    const stable: RewardTokenBalance[] = STABLECOINS.map((s, i) => {
      const r = result.data?.[i];
      const raw = r?.status === "success" ? (r.result as bigint) : BigInt(0);
      const dollars = Number(raw) / 10 ** s.decimals;
      return { ...s, raw, dollars, isVolatile: false };
    });

    if (!includeCelo) return stable;

    const raw = (celoBalance.data as bigint | undefined) ?? BigInt(0);
    const celoFloat = Number(raw) / 10 ** CELO_TOKEN_DECIMALS;
    // Only count CELO toward the dollar total when we have a fresh price.
    // Otherwise show CELO with $0 dollar contribution + a stale flag the
    // UI can surface separately.
    const dollars = celoUsd.price !== null ? celoFloat * celoUsd.price : 0;
    const celo: RewardTokenBalance = {
      symbol: "CELO" as never,
      address: CELO_TOKEN_ADDRESS,
      decimals: CELO_TOKEN_DECIMALS,
      logo: "/celologotoken.png",
      raw,
      dollars,
      isVolatile: true,
    };
    return [...stable, celo];
  }, [result.data, celoBalance.data, celoUsd.price, includeCelo]);

  const totalDollars = useMemo(
    () => balances.reduce((sum, b) => sum + b.dollars, 0),
    [balances]
  );

  return {
    balances,
    totalDollars,
    celoUsdPrice: includeCelo ? celoUsd.price : null,
    celoPriceIsFresh: includeCelo ? celoUsd.isFresh : true,
    isLoading: result.isLoading || (includeCelo && celoBalance.isLoading),
    isError: result.isError,
    refetch: result.refetch,
  };
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
