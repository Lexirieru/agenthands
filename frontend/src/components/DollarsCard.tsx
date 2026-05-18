'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useStablecoinBalances } from '@/hooks/useAgentHands';

/**
 * MiniPay-style balance card for the Celo dashboard.
 *
 * Shows the total USD-equivalent balance across all whitelisted stablecoins
 * (USDC, USDT, USDm). When `includeCelo` is true (desktop only), the CELO
 * ERC-20 balance is also fetched and converted via the Chainlink CELO/USD
 * feed (`0x0568fD19986748cEfF3301e55c0eb1E729E0Ab7e`) and folded into the
 * total. If the price feed is stale, CELO shows "$0" contribution and a
 * "price unavailable" label rather than a frozen value.
 *
 * Clicking the chevron expands an animated per-token breakdown rendered as
 * white sub-cards inside the same dark panel — matching MiniPay's style.
 */
interface DollarsCardProps {
  address: `0x${string}` | undefined;
  /** Desktop only — fold CELO balance into the total via Chainlink CELO/USD. */
  includeCelo?: boolean;
}

function formatDollars(n: number): string {
  if (n === 0) return '0';
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

function formatTokenAmount(raw: bigint, decimals: number): string {
  const dollars = Number(raw) / 10 ** decimals;
  return formatDollars(dollars);
}

export default function DollarsCard({ address, includeCelo = false }: DollarsCardProps) {
  const [open, setOpen] = useState(false);
  const { balances, totalDollars, isLoading, celoUsdPrice, celoPriceIsFresh } =
    useStablecoinBalances(address, { includeCelo });

  return (
    <div className="relative">
      {/* Solid colored card — MiniPay-style. Uses our dark-brown brand color
          instead of green so it sits inside the warm AgentHands palette. */}
      <div className="bg-[#5C2D0A] rounded-3xl px-5 pt-5 pb-9 text-white shadow-lg shadow-[#5C2D0A]/20 overflow-hidden">
        <p className="text-xs font-label uppercase tracking-wider text-white/70">
          Dollars
        </p>
        <p className="text-4xl md:text-5xl font-bold mt-1.5 tabular-nums leading-none">
          ${isLoading ? '0' : formatDollars(totalDollars)}
        </p>

        {/* Animated breakdown — stacks inside the same dark card so it feels
            like one panel that "unfolds", just like MiniPay. */}
        <div
          className={`grid transition-all duration-300 ease-out ${
            open
              ? 'grid-rows-[1fr] opacity-100 mt-5'
              : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'
          }`}
          aria-hidden={!open}
        >
          <div className="overflow-hidden">
            <div className="border-t border-white/15 pt-4 grid grid-cols-2 gap-3">
              {balances.map((b) => (
                <div
                  key={b.symbol}
                  className="bg-white rounded-2xl px-4 py-3 relative shadow-sm"
                >
                  {b.logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.logo}
                      alt={b.symbol}
                      className="absolute top-2.5 right-2.5 w-6 h-6 opacity-95"
                    />
                  )}
                  <p className="text-xl md:text-2xl font-bold text-[#5C2D0A] tabular-nums pr-7 leading-tight">
                    {formatTokenAmount(b.raw, b.decimals)}
                  </p>
                  <p className="text-[11px] text-[#8B4513] font-label uppercase tracking-wider mt-0.5">
                    {b.symbol}
                  </p>
                  {b.isVolatile && b.raw > BigInt(0) && (
                    <p className="text-[10px] text-[#A8763B] mt-1 tabular-nums">
                      {celoPriceIsFresh && celoUsdPrice
                        ? `≈ $${b.dollars >= 0.01 ? b.dollars.toFixed(2) : b.dollars.toFixed(4)}`
                        : 'price unavailable'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating chevron pill — sits at the bottom edge, half-overlapping the
          card. Click toggles the breakdown. Rotates 180° on open. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Hide token breakdown' : 'Show token breakdown'}
        aria-expanded={open}
        className="absolute left-1/2 -translate-x-1/2 -bottom-4 w-10 h-10 rounded-full bg-[#3F1D06] text-white border-4 border-[var(--background)] flex items-center justify-center shadow-md hover:bg-[#5C2D0A] transition-colors"
      >
        <ChevronDown
          size={18}
          className={`transition-transform duration-300 ease-out ${
            open ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>
    </div>
  );
}
