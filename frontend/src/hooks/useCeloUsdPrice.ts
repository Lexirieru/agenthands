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
/** Maximum age (seconds) for a Chainlink answer before it is treated as stale; matches Celo oracle heartbeat. */
const STALE_AFTER_SECONDS = 60 * 60; // 1 hour

/**
 * Shape of the value returned by `useCeloUsdPrice` on Celo mainnet.
 * @since 1.0.0
 */
export interface CeloUsdPriceResult {
  /** Price in USD (e.g. 0.0966) — null if unavailable, stale (> 1 h), or feed answer ≤ 0. */
  price: number | null;
  /** Last on-chain update unix-seconds from `latestRoundData.updatedAt` — null if the feed call fails. */
  updatedAt: number | null;
  /** True only when we have a fresh (age < 1 h), positive answer from the Chainlink CELO/USD feed on Celo. */
  isFresh: boolean;
  /** True while either the `latestRoundData` or `decimals` Chainlink RPC call is in flight on Celo. */
  isLoading: boolean;
}

/**
 * Read Chainlink's CELO/USD feed on Celo mainnet and return a clean number
 * + freshness flag.
 *
 * Feed address: `0x0568fD19986748cEfF3301e55c0eb1E729E0Ab7e` (8-decimal answer).
 * The feed refreshes several times per hour; answers older than
 * `STALE_AFTER_SECONDS` (1 h) are treated as unavailable so we never show
 * a frozen price to users. When stale, `price` is returned as `null` and
 * `isFresh` is false — callers should surface a "price unavailable" label
 * rather than displaying a stale value.
 *
 * The hook issues two `latestRoundData` + `decimals` reads, both with a
 * 1-minute `refetchInterval`. The `decimals` call uses `staleTime: Infinity`
 * because the Chainlink oracle's decimal precision never changes at runtime.
 * Any negative or zero `answer` from the feed is also treated as unavailable.
 *
 * @since 1.0.0
 *
 * Used exclusively by `useStablecoinBalances` (with `includeCelo: true`) to
 * fold CELO balances into the desktop DollarsCard total. MiniPay / mobile
 * surfaces skip this hook — those layouts are stablecoin-only by design.
 *
 * @param enabled - Set to false to skip all RPC calls (e.g. inside MiniPay).
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
