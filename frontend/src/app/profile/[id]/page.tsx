"use client";

import { useAccount } from "wagmi";
import { User, ExternalLink } from "lucide-react";
import { useUSDCBalance } from "@/hooks/useAgentHands";
import { CHAIN, EXPLORER_URL } from "@/config";
import { formatUSDC } from "@/lib/utils/format";
import SelfVerify from "@/components/SelfVerify";
import ConnectPrompt from "@/components/ConnectPrompt";

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { data: usdcBalance } = useUSDCBalance(address as `0x${string}` | undefined);

  const usdcFormatted = usdcBalance !== undefined ? formatUSDC(usdcBalance as bigint) : "0.00";

  if (!isConnected) {
    return (
      <div className="min-h-[calc(100dvh-7.5rem)] px-4 py-12 mx-auto w-full max-w-md">
        <ConnectPrompt title="Connect Your Wallet" subtitle="Connect to view your profile" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-7.5rem)] px-4 py-6 md:py-12 overflow-y-auto mx-auto w-full max-w-2xl">
      <h1 className="text-2xl md:text-4xl font-bold text-[#5C2D0A] mb-6 md:mb-8 font-heading">Profile</h1>

      {/* Wallet card */}
      <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#5C2D0A]/10 flex items-center justify-center">
            <User size={24} className="text-[#5C2D0A]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[#5C2D0A]">Wallet</div>
            <div className="text-xs text-[#8B4513] font-mono truncate">{address}</div>
          </div>
        </div>

        <div className="p-4 bg-[#D4700A]/10 rounded-xl border border-[#D4700A]/20 mb-4">
          <div className="flex items-center gap-2">
            <img src="/usdclogo.png" alt="USDC" className="h-8 w-8" />
            <div>
              <div className="text-2xl font-bold text-[#D4700A]">${usdcFormatted}</div>
              <div className="text-xs text-[#8B4513] font-label">USDC on {CHAIN.name}</div>
            </div>
          </div>
        </div>

        <a
          href={`${EXPLORER_URL}/address/${address}`}
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--card)] rounded-xl text-sm text-[#5C2D0A] font-label min-h-[44px]"
        >
          <ExternalLink size={14} />
          View on CeloScan
        </a>
      </div>

      {/* Self Verify */}
      <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-[#5C2D0A] mb-3">Identity Verification</h2>
        <SelfVerify onVerified={() => {}} />
      </div>
    </div>
  );
}
