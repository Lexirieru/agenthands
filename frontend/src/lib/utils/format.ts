import {
  STABLECOINS,
  CELO_TOKEN_ADDRESS,
  CELO_TOKEN_DECIMALS,
} from "@/config";

const USDC_DECIMALS = 6;

/**
 * Format raw USDC amount (6 decimals) to a short human-readable string.
 * Kept for legacy callers — prefer `formatRewardDisplay(raw, paymentToken)`
 * everywhere new so multi-token rewards (USDT/USDm/CELO) render correctly.
 */
export function formatUSDC(raw: string | number | bigint): string {
  return formatTokenAmount(raw, USDC_DECIMALS, { trimTrailingZeros: false });
}

/**
 * Format an arbitrary on-chain token amount given its decimals.
 *  - 1_000_000n at 6 decimals → "1"
 *  - 100_000_000_000_000_000n at 18 decimals → "0.1"
 *  - With trimTrailingZeros=false: "1" → "1.00" (legacy USDC display).
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
    return raw.toString();
  }
}

export type TokenInfo = {
  symbol: string;
  decimals: number;
  isStablecoin: boolean;
  logo: string | null;
};

/**
 * Look up the user-facing metadata for a payment token address. Falls back
 * to USDC when the address is missing (legacy code paths) and to a generic
 * "TOKEN" label for anything not in our registry, so callers never crash.
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
 * Render a reward amount with its token symbol, picking the right format:
 *  - stablecoins: "$0.5" (USD-style, since they're 1:1 with USD)
 *  - everything else: "0.1 CELO" (no $ prefix — value isn't $-pegged)
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
 * Default: first 6 chars + `…` + last 4 chars, matching Celoscan's style.
 */
export function truncateAddress(address: string, start = 6, end = 4): string {
  if (address.length <= start + end + 3) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

/**
 * Format a date string or timestamp to relative time or locale string
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
 * Map the Celo AgentHands `TaskStatus` enum to a UI label + Tailwind color.
 * Enum values: 0=Open, 1=Accepted, 2=Submitted, 3=Completed,
 *              4=Disputed, 5=Cancelled, 6=Expired.
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
