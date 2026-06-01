/** @module format — Display formatting utilities for Celo AgentHands token amounts, addresses, and task status. */
import {
  STABLECOINS,
  CELO_TOKEN_ADDRESS,
  CELO_TOKEN_DECIMALS,
} from "@/config";

/** USDC decimal precision on Celo mainnet — 6 decimals, same as on Ethereum. */
const USDC_DECIMALS = 6;

/**
 * Format raw USDC amount (6 decimals) to a short human-readable string.
 * @since 1.0.0
 * Kept for legacy callers — prefer `formatRewardDisplay(raw, paymentToken)`
 * everywhere new so multi-token rewards (USDT/USDm/CELO) render correctly.
 */
export function formatUSDC(raw: string | number | bigint): string {
  return formatTokenAmount(raw, USDC_DECIMALS, { trimTrailingZeros: false });
}

/**
 * Format an arbitrary on-chain token amount given its decimals.
 * @since 1.0.0
 *  - `1_000_000n` at 6 decimals → `"1"` (1 USDC on Celo)
 *  - `100_000_000_000_000_000n` at 18 decimals → `"0.1"` (0.1 CELO)
 *  - With `trimTrailingZeros=false`: `"1"` → `"1.00"` (legacy USDC display).
 * @param raw      Raw `bigint` token amount from Celo contract ABI decoding.
 * @param decimals Token decimal precision (6 for USDC/USDT, 18 for CELO/USDm).
 * @returns        Human-readable decimal string with trailing zeros stripped by default.
 */
export function formatTokenAmount(
  raw: string | number | bigint,
  decimals: number,
  opts: { trimTrailingZeros?: boolean } = { trimTrailingZeros: true }
): string {
  try {
    const value = BigInt(raw);
    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = value / divisor;
    const fraction = value % divisor;

    if (fraction === BigInt(0)) {
      return opts.trimTrailingZeros ? `${whole}` : `${whole}.00`;
    }

    let fractionStr = fraction.toString().padStart(decimals, "0");
    if (opts.trimTrailingZeros) {
      fractionStr = fractionStr.replace(/0+$/, "");
    }
    return `${whole}.${fractionStr}`;
  } catch {
    // Malformed raw value — return the original string rather than throwing.
    return raw.toString();
  }
}

/**
 * Resolved metadata for a whitelisted AgentHands payment token.
 * @since 1.0.0
 * Returned by `tokenInfoForAddress` and consumed by reward-display helpers and TaskCard.
 */
export type TokenInfo = {
  /** Short ticker symbol shown in the UI (e.g. "USDC", "CELO"). */
  symbol: string;
  /** Number of decimals for this token (6 for USDC/USDT, 18 for USDm/CELO). */
  decimals: number;
  /** True for dollar-pegged tokens; controls whether a `$` prefix is rendered. */
  isStablecoin: boolean;
  /** Path to the token logo served from `/public`, or null for unknown tokens. */
  logo: string | null;
};

/**
 * Look up the user-facing metadata for a Celo payment token address.
 * @since 1.0.0
 * Falls back to USDC when the address is missing (legacy code paths) and to a generic
 * `"TOKEN"` label for anything not in the registry, so callers never crash.
 * @param addr Celo ERC-20 token address, or `null`/`undefined` for legacy USDC paths.
 * @returns `TokenInfo` with symbol, decimals, isStablecoin, and logo for the given token.
 */
export function tokenInfoForAddress(addr: string | undefined | null): TokenInfo {
  if (!addr) {
    const usdc = STABLECOINS.find((s) => s.symbol === "USDC")!;
    return { symbol: usdc.symbol, decimals: usdc.decimals, isStablecoin: true, logo: usdc.logo };
  }
  const a = addr.toLowerCase();
  for (const s of STABLECOINS) {
    if (s.address.toLowerCase() === a) {
      return { symbol: s.symbol, decimals: s.decimals, isStablecoin: true, logo: s.logo };
    }
  }
  if (a === CELO_TOKEN_ADDRESS.toLowerCase()) {
    return {
      symbol: "CELO",
      decimals: CELO_TOKEN_DECIMALS,
      isStablecoin: false,
      logo: "/celologotoken.png",
    };
  }
  return { symbol: "TOKEN", decimals: 18, isStablecoin: false, logo: null };
}

/**
 * Render a reward amount with its token symbol, picking the right format.
 * @since 1.0.0
 *  - Stablecoins (USDC/USDT/USDm): `"$0.5"` (USD-style, 1:1 peg on Celo)
 *  - Non-stablecoins (CELO ERC-20): `"0.1 CELO"` (no `$` — value not USD-pegged)
 * @param raw          Raw on-chain `bigint` reward amount.
 * @param paymentToken Celo ERC-20 address of the reward token.
 * @returns            Human-readable reward string with appropriate prefix/suffix.
 */
export function formatRewardDisplay(
  raw: string | number | bigint,
  paymentToken: string | undefined | null
): string {
  const info = tokenInfoForAddress(paymentToken);
  const amount = formatTokenAmount(raw, info.decimals);
  return info.isStablecoin ? `$${amount}` : `${amount} ${info.symbol}`;
}

/**
 * Truncate a Celo wallet address for display — e.g. `0xADA046…3f746`.
 * @since 1.0.0
 * Default: first 6 chars + `…` + last 4 chars, matching Celoscan's style.
 *
 * @param address Full 42-character Celo/EVM address string.
 * @param start   Number of leading characters to keep (default: 6).
 * @param end     Number of trailing characters to keep (default: 4).
 * @returns       Truncated string, or the original if it's short enough to fit.
 *
 * @example
 * truncateAddress('0xADA0466303441102cb16F8eC1594C744d603f746')
 * // → '0xADA0...3f746'
 */
export function truncateAddress(address: string, start = 6, end = 4): string {
  if (address.length <= start + end + 3) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

/**
 * Format a Unix timestamp (seconds) or ISO date string to a relative or locale date string.
 *
 * Because Celo block timestamps are in seconds, numeric inputs are multiplied by 1 000
 * before being passed to the Date constructor. Relative labels are returned for events
 * within the last 7 days (e.g. "3h ago"), which covers most in-progress task activity;
 * older dates fall back to `toLocaleDateString()` for brevity.
 *
 * @since 1.0.0
 * @param dateStr Unix timestamp in seconds (Celo block time) or ISO date string.
 * @returns       Relative label (e.g. `"3h ago"`) or locale date string.
 */
export function formatDate(dateStr: string | number): string {
  const date = typeof dateStr === 'number' ? new Date(dateStr * 1000) : new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

/**
 * Map the Celo AgentHands `TaskStatus` enum to a UI label + Tailwind color class.
 * Enum values: 0=Open, 1=Accepted, 2=Submitted, 3=Completed,
 *              4=Disputed, 5=Cancelled, 6=Expired.
 *
 * Used by TaskCard and TaskDetailPage status badges. Unknown values fall
 * back to a generic "Status N" label so the UI degrades gracefully if
 * new enum variants are added to the Celo contract without a frontend update.
 *
 * @since 1.0.0
 * @param status Numeric `TaskStatus` enum value from the AgentHands Celo contract.
 * @returns      Object with `label` (human-readable string) and `color` (Tailwind text class).
 */
export function getStatusDisplay(status: number): { label: string; color: string } {
  switch (status) {
    case 0:
      return { label: 'Open', color: 'text-green-600' };
    case 1:
      return { label: 'Accepted', color: 'text-blue-600' };
    case 2:
      return { label: 'Submitted', color: 'text-yellow-600' };
    case 3:
      return { label: 'Completed', color: 'text-green-700' };
    case 4:
      return { label: 'Disputed', color: 'text-red-600' };
    case 5:
      return { label: 'Cancelled', color: 'text-gray-500' };
    case 6:
      return { label: 'Expired', color: 'text-gray-500' };
    default:
      return { label: `Status ${status}`, color: 'text-gray-500' };
  }
}
