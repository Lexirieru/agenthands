"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { Wallet } from "lucide-react";
import { useUSDCBalance } from "@/hooks/useAgentHands";
import { truncateAddress } from "@/lib/utils/format";

const navLinks = [
  { href: "/tasks", label: "TASKS" },
  { href: "/dashboard", label: "DASHBOARD" },
];

export default function Header() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { data: rawBalance } = useUSDCBalance(address as `0x${string}` | undefined);

  const usdcFormatted =
    rawBalance !== undefined
      ? parseFloat(formatUnits(rawBalance, 6)).toFixed(2)
      : null;

  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)]">
      {/* ── Mobile header ── */}
      <div className="md:hidden bg-[var(--card-solid)]/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <Image src="/AgentHandsLogo.png" alt="AgentHands" width={28} height={28} />
            <span className="text-lg font-bold text-[#5C2D0A] tracking-tight">AgentHands</span>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && usdcFormatted && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-xs font-medium text-[#D4700A]">
                <img src="https://cdn.morpho.org/assets/logos/usdc.svg" alt="USDC" className="h-4 w-4" />
                ${usdcFormatted}
              </span>
            )}
            {isConnected && address && (
              <span className="px-3 py-1.5 rounded-full bg-[#5C2D0A] text-white text-xs font-medium">
                {address.slice(0, 4)}...{address.slice(-4)}
              </span>
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

                {/* USDC Balance */}
                {isConnected && usdcFormatted && (
                  <span className="text-xs bg-[var(--card)] text-[#D4700A] px-3 py-1.5 rounded-full border border-[var(--border)] font-label mr-1 inline-flex items-center gap-1.5">
                    <img src="https://cdn.morpho.org/assets/logos/usdc.svg" alt="USDC" className="h-4 w-4" />
                    ${usdcFormatted}
                  </span>
                )}

                {/* Wallet */}
                {isConnected && address ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5C2D0A] text-white border border-[#5C2D0A] rounded-full text-xs font-label">
                    <Wallet size={14} />
                    {truncateAddress(address)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-4 py-1.5 bg-[#5C2D0A] text-white rounded-full text-xs font-label">
                    <Wallet size={14} />
                    Connecting...
                  </span>
                )}
              </div>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
