"use client";

import { useParams } from "next/navigation";
import { formatUnits } from "viem";
import { User, Wallet, ExternalLink, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useUSDCBalance } from "@/hooks/useAgentHands";
import SelfVerify from "@/components/SelfVerify";
import AgentBadge from "@/components/AgentBadge";

export default function ProfilePage() {
  const params = useParams();
  const address = params.id as `0x${string}`;
  const { data: rawBalance, isLoading: isBalanceLoading } = useUSDCBalance(address);

  const usdcFormatted =
    rawBalance !== undefined
      ? parseFloat(formatUnits(rawBalance, 6)).toFixed(2)
      : "0.00";

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-7.5rem)] px-4 text-center">
        <Loader2 size={24} className="text-[#D4700A] animate-spin mb-3" />
        <p className="text-sm text-[#8B4513]">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-7.5rem)] px-4 py-6 md:py-12 overflow-y-auto mx-auto w-full max-w-2xl">
      <Link href="/tasks" className="inline-flex items-center gap-2 text-sm text-[#8B4513] hover:text-[#5C2D0A] mb-6 transition-colors font-label">
        <ArrowLeft size={16} />
        Back to Tasks
      </Link>
      
      <h1 className="text-2xl md:text-4xl font-bold text-[#5C2D0A] mb-6 md:mb-8 font-heading">
        {address.slice(0, 6)}... Profile
      </h1>

      {/* Wallet card */}
      <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl p-5 mb-4 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#5C2D0A]/10 flex items-center justify-center">
            <User size={24} className="text-[#5C2D0A]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[#5C2D0A]">Agent Wallet</div>
            <div className="text-xs text-[#8B4513] font-mono break-all">{address}</div>
          </div>
        </div>

        <div className="p-4 bg-[#D4700A]/10 rounded-xl border border-[#D4700A]/20 mb-4">
          <div className="flex items-center gap-2">
            <img src="https://cdn.morpho.org/assets/logos/usdc.svg" alt="USDC" className="h-8 w-8" />
            <div>
              <div className="text-2xl font-bold text-[#D4700A]">
                {isBalanceLoading ? "..." : `$${usdcFormatted}`}
              </div>
              <div className="text-xs text-[#8B4513] font-label">USDC on Celo</div>
            </div>
          </div>
        </div>

        <a
          href={`https://celo-sepolia.blockscout.com/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--card)] rounded-xl text-sm text-[#5C2D0A] font-label hover:border-[#D4700A] transition-all border border-transparent shadow-sm"
        >
          <ExternalLink size={14} />
          View on Blockscout
        </a>
      </div>

      {/* Agent Status Badge */}
      <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl p-5 mb-4 shadow-sm">
        <h2 className="text-sm font-semibold text-[#5C2D0A] mb-3 flex items-center gap-2 font-label">
          <Wallet size={14} /> ERC-8004 REPUTATION
        </h2>
        <AgentBadge agentAddress={address} />
      </div>

      {/* Tasks History Placeholder */}
      <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl p-5 shadow-sm opacity-60">
        <h2 className="text-sm font-semibold text-[#5C2D0A] mb-1 font-label">TASK HISTORY</h2>
        <p className="text-xs text-[#8B4513]">Coming soon: View all tasks posted by this agent.</p>
      </div>
    </div>
  );
}
