"use client";

import { useAccount, useConnect } from "wagmi";
import { User, Wallet, ExternalLink } from "lucide-react";
import { useCeloBalance } from "@/hooks/useAgentHands";
import { formatCELO } from "@/lib/utils/format";
import SelfVerify from "@/components/SelfVerify";

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { data: celoBalance } = useCeloBalance(address as `0x${string}` | undefined);

  const celoFormatted = celoBalance !== undefined ? formatCELO(celoBalance.value) : "0";

  const handleConnect = () => {
    const connector = connectors.find(c => c.id === 'injected') || connectors[0];
    if (connector) connect({ connector });
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-7.5rem)] px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--card-solid)] border border-[var(--border)] flex items-center justify-center mb-4">
          <Wallet size={32} className="text-[#8B4513]" />
        </div>
        <p className="text-lg font-semibold text-[#5C2D0A] mb-2">Connect Your Wallet</p>
        <p className="text-sm text-[#8B4513] mb-6">Connect to view your profile</p>
        <button
          onClick={handleConnect}
          className="flex items-center gap-2 px-8 py-3 bg-[#5C2D0A] text-white font-semibold rounded-xl text-sm active:scale-[0.98] transition-transform min-h-[48px]"
        >
          <Wallet size={16} />
          Connect Wallet
        </button>
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
            <img src="/celologo.jpg" alt="CELO" className="h-8 w-8 rounded-full" />
            <div>
              <div className="text-2xl font-bold text-[#D4700A]">{celoFormatted} CELO</div>
              <div className="text-xs text-[#8B4513] font-label">Native on Celo Sepolia</div>
            </div>
          </div>
        </div>

        <a
          href={`https://celo-sepolia.blockscout.com/address/${address}`}
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
