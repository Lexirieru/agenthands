"use client";

import { useReadContract } from "wagmi";
import { CELO_USD_FEED_ADDRESS } from "@/config";

const FEED_ABI = [
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    name: "latestRoundData",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

// Chainlink CELO/USD on Celo mainnet refreshes a few times an hour. If the
// last update is more than this many seconds old we treat the price as
// stale and skip it instead of pricing balances from a frozen feed.
const STALE_AFTER_SECONDS = 60 * 60; // 1 hour

export interface CeloUsdPriceResult {
  /** Price in USD (e.g. 0.0966) — null if unavailable or stale. */
  price: number | null;
  /** Last on-chain update unix-seconds — null if unavailable. */
  updatedAt: number | null;
  /** True only when we have a fresh, positive answer. */
  isFresh: boolean;
  isLoading: boolean;
}

/**
 * Read Chainlink's CELO/USD feed and return a clean number + freshness
 * flag. We use this to convert CELO balances to a USD equivalent for the
 * desktop DollarsCard total. On mobile / inside MiniPay the caller skips
 * this hook entirely — that surface is stablecoin-only by design.
 */
export function useCeloUsdPrice(enabled = true): CeloUsdPriceResult {
  const round = useReadContract({
    address: CELO_USD_FEED_ADDRESS,
    abi: FEED_ABI,
    functionName: "latestRoundData",
    query: {
      enabled,
      refetchInterval: 60_000, // 1 minute — cheaper than CELO chain blocks
      refetchOnWindowFocus: true,
      staleTime: 30_000,
    },
  });

  const decimals = useReadContract({
    address: CELO_USD_FEED_ADDRESS,
    abi: FEED_ABI,
    functionName: "decimals",
    query: { enabled, staleTime: Infinity },
  });

  if (round.isLoading || decimals.isLoading) {
    return { price: null, updatedAt: null, isFresh: false, isLoading: true };
  }

  const data = round.data as readonly [bigint, bigint, bigint, bigint, bigint] | undefined;
  const dec = decimals.data as number | undefined;
  if (!data || dec === undefined) {
    return { price: null, updatedAt: null, isFresh: false, isLoading: false };
  }

  const answer = data[1];
  const updatedAt = Number(data[3]);
  if (answer <= BigInt(0)) {
    return { price: null, updatedAt, isFresh: false, isLoading: false };
  }

  const price = Number(answer) / 10 ** dec;
  const ageSeconds = Math.floor(Date.now() / 1000) - updatedAt;
  const isFresh = ageSeconds <= STALE_AFTER_SECONDS;

  return {
    price: isFresh ? price : null,
    updatedAt,
    isFresh,
    isLoading: false,
  };
}
