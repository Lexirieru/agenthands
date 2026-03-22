const USDC_DECIMALS = 6;

/**
 * Format raw USDC amount (6 decimals) to human-readable string.
 * e.g. "1000000" -> "1.00"
 */
export function formatUSDC(raw: string | number | bigint): string {
  try {
    const value = BigInt(raw);
    const divisor = BigInt(10 ** USDC_DECIMALS);
    const whole = value / divisor;
    const fraction = value % divisor;

    if (fraction === BigInt(0)) {
      return `${whole}.00`;
    }

    const fractionStr = fraction.toString().padStart(USDC_DECIMALS, '0').replace(/0+$/, '');
    return `${whole}.${fractionStr}`;
  } catch {
    return raw.toString();
  }
}

/**
 * Truncate an address for display
 * e.g. "0x1234...abcd"
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
 * Get status display label and color for contract status enum
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
