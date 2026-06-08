"use client";
/** @module Header — Sticky Celo AgentHands app header for desktop and mobile layouts. */

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Wallet, LogOut } from "lucide-react";
import { useStablecoinBalances } from "@/hooks/useAgentHands";
import { useIsMiniPay } from "@/hooks/useIsMiniPay";
import { useIsMobile } from "@/hooks/useIsMobile";
import { truncateAddress } from "@/lib/utils/format";
import { useState, useEffect } from "react";

/** Desktop nav link definitions — rendered as a segmented pill inside the glassmorphism header bar on Celo AgentHands. */
const navLinks = [
  { href: "/tasks", label: "TASKS" },
  { href: "/dashboard", label: "DASHBOARD" },
];

/**
 * Sticky app header for the Celo AgentHands desktop and mobile layouts.
 *
 * **Mobile** (`< 768 px`): compact bar with logo, wallet address pill, and a
 * "Connect" button. MiniPay/Valora users see "Connecting…" instead — the
 * manual connect button is hidden per MiniPay's UX spec.
 *
 * **Desktop** (`≥ 768 px`): pill-shaped glassmorphism nav with logo, TASKS /
 * DASHBOARD links, a combined USD balance pill (stablecoins + CELO via
 * Chainlink), and a wallet button that flips to "Disconnect" on hover.
 *
 * CELO balance is included in the header pill only on desktop (`!isMobile &&
 * !isMiniPay`), matching the `DollarsCard` `includeCelo` split — Chainlink
 * price feed on Celo is used to convert the CELO balance to USD. Balances are
 * formatted to 2 dp when ≥ $1, or up to 6 dp with trailing zeros stripped
 * for micro-balances (common with USDC 6-decimal amounts on Celo).
 *
 * `mounted` guard prevents Next.js SSR/hydration mismatches from wagmi wallet account state on Celo.
 *
 * @since 1.0.0
 */
export default function Header() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const isMiniPay = useIsMiniPay();
  const isMobile = useIsMobile();
  // Mirror the DollarsCard split: include Celo ERC-20 (`0x471EcE3…`, 18 dec) only
  // on desktop browsers — MiniPay and mobile layouts stay stablecoin-only by design.
  const includeCelo = !isMobile && !isMiniPay;
  const { totalDollars, isLoading: balancesLoading } = useStablecoinBalances(
    address as `0x${string}` | undefined,
    { includeCelo }
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Show the combined $-pegged stablecoin balance (USDC + USDT + USDm) in the
  // header pill without per-token logos — the Celo account may hold any mix and
  // the pill is meant to read as a single "total dollars" figure.
  const dollarsFormatted = !isConnected || balancesLoading
    ? null
    : totalDollars >= 1
      ? totalDollars.toFixed(2)
      : totalDollars.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");

  /** Returns `true` when the current Next.js pathname exactly matches the given nav link href on Celo AgentHands. */
  const isActive = (href: string) => pathname === href;

  /**
   * Initiates Celo wallet connection — prefers the injected connector (MiniPay/MetaMask)
   * so the existing wallet session is reused; falls back to the first available connector (WalletConnect).
   * @since 1.0.0
   */
  const handleConnect = () => {
    // Priority: injected (MiniPay/MetaMask) → walletConnect (for non-injected Celo wallets)
    const connector = connectors.find(c => c.id === 'injected') || connectors[0];
    if (connector) {
      connect({ connector });
    }
  };

  if (!mounted) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)]">
      {/* ── Mobile header ── */}
      <div className="md:hidden bg-[var(--card-solid)]/90 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-2.5 max-w-md mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/AgentHandsLogo.png" alt="AgentHands" width={24} height={24} />
            <span className="text-base font-bold text-[#5C2D0A]">AgentHands</span>
          </Link>
          <div className="flex items-center gap-2">
            {isConnected && dollarsFormatted !== null && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--card)] border border-[var(--border)] text-xs font-medium text-[#D4700A]">
                ${dollarsFormatted}
              </span>
            )}
            {isConnected && address ? (
              <button
                onClick={() => disconnect()}
                className="h-8 px-2.5 rounded-full bg-[#5C2D0A] text-white text-xs font-medium"
              >
                {address.slice(0, 4)}...{address.slice(-3)}
              </button>
            ) : isMiniPay ? (
              // Celo MiniPay auto-connects via useAutoConnect — showing a manual Connect button is discouraged per MiniPay UX spec.
              <span className="h-8 px-2.5 rounded-full bg-[var(--card)] text-[#8B4513] text-[10px] font-medium inline-flex items-center">
                Connecting…
              </span>
            ) : (
              <button
                onClick={handleConnect}
                className="h-8 px-3 rounded-full bg-[#D4700A] text-white text-xs font-medium flex items-center gap-1"
              >
                <Wallet size={13} /> Connect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Desktop header ── */}
      <div className="hidden md:block bg-[var(--card-solid)]/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-3 pb-2">
          <div className="relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-24 h-12 bg-[#D4700A]/25 blur-2xl rounded-full pointer-events-none" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-24 h-12 bg-[#D4700A]/25 blur-2xl rounded-full pointer-events-none" />

            <nav className="relative flex items-center justify-between bg-[var(--card-solid)]/80 backdrop-blur-md border border-[var(--border)] rounded-full px-5 py-2">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 shrink-0">
                <Image src="/AgentHandsLogo.png" alt="AgentHands" width={28} height={28} />
                <span className="text-lg font-bold text-[#5C2D0A] tracking-tight">AgentHands</span>
              </Link>

              {/* Nav links + wallet */}
              <div className="flex items-center gap-1">
                <div className="flex items-center border border-[var(--border)] rounded-full overflow-hidden mr-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`px-4 py-1.5 text-xs font-medium tracking-wider transition-colors font-label ${
                        isActive(link.href)
                          ? "text-[#5C2D0A] bg-[var(--card)]"
                          : "text-[#5C2D0A] hover:bg-[var(--card)]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                {/* Stablecoin balance — combined USD across USDC + USDT + USDm */}
                {isConnected && dollarsFormatted !== null && (
                  <span className="text-xs bg-[var(--card)] text-[#D4700A] px-3 py-1.5 rounded-full border border-[var(--border)] font-label mr-1 inline-flex items-center">
                    ${dollarsFormatted}
                  </span>
                )}

                {/* Wallet */}
                {isConnected && address ? (
                  <button
                    onClick={() => disconnect()}
                    className="group flex items-center gap-1.5 px-3 py-1.5 bg-[#5C2D0A] text-white border border-[#5C2D0A] rounded-full text-xs font-label hover:bg-red-900 transition-colors"
                  >
                    <Wallet size={14} className="group-hover:hidden" />
                    <LogOut size={14} className="hidden group-hover:block" />
                    <span className="group-hover:hidden">{truncateAddress(address)}</span>
                    <span className="hidden group-hover:block">Disconnect</span>
                  </button>
                ) : isMiniPay ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[var(--card)] text-[#8B4513] border border-[var(--border)] rounded-full text-xs font-label">
                    <Wallet size={14} /> Connecting…
                  </span>
                ) : (
                  <button
                    onClick={handleConnect}
                    className="flex items-center gap-1.5 px-6 py-1.5 bg-[#D4700A] text-white rounded-full text-xs font-bold font-label hover:bg-[#B35D08] transition-all shadow-lg shadow-[#D4700A]/20"
                  >
                    <Wallet size={14} />
                    Connect Wallet
                  </button>
                )}
              </div>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
