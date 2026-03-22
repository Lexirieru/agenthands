"use client";

import { useReadContract } from "wagmi";
import { IDENTITY_REGISTRY, REPUTATION_REGISTRY, ERC8004_CHAIN_ID } from "@/config/erc8004";
import IdentityRegistryABI from "@/abi/IdentityRegistry.json";
import ReputationRegistryABI from "@/abi/ReputationRegistry.json";

interface AgentBadgeProps {
  agentAddress: string;
}

export default function AgentBadge({ agentAddress }: AgentBadgeProps) {
  // Check if address owns an agent NFT by trying to get balance
  const { data: balance } = useReadContract({
    address: IDENTITY_REGISTRY,
    abi: IdentityRegistryABI,
    functionName: "balanceOf",
    args: [agentAddress as `0x${string}`],
    chainId: ERC8004_CHAIN_ID,
  });

  // Get reputation clients
  const { data: agentTokenId } = useReadContract({
    address: IDENTITY_REGISTRY,
    abi: IdentityRegistryABI,
    functionName: "tokenOfOwnerByIndex",
    args: [agentAddress as `0x${string}`, BigInt(0)],
    chainId: ERC8004_CHAIN_ID,
    query: { enabled: !!balance && Number(balance) > 0 },
  });

  const { data: agentURI } = useReadContract({
    address: IDENTITY_REGISTRY,
    abi: IdentityRegistryABI,
    functionName: "tokenURI",
    args: [agentTokenId as bigint],
    chainId: ERC8004_CHAIN_ID,
    query: { enabled: !!agentTokenId },
  });

  const { data: clients } = useReadContract({
    address: REPUTATION_REGISTRY,
    abi: ReputationRegistryABI,
    functionName: "getClients",
    args: [agentTokenId as bigint],
    chainId: ERC8004_CHAIN_ID,
    query: { enabled: !!agentTokenId },
  });

  const isVerified = !!balance && Number(balance) > 0;
  const reviewCount = Array.isArray(clients) ? clients.length : 0;

  if (!isVerified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-700/50 text-gray-400 text-xs">
        ❓ Unverified Agent
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
        🆔 ERC-8004 Verified
      </span>
      {reviewCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
          ⭐ {reviewCount} review{reviewCount > 1 ? "s" : ""}
        </span>
      )}
      {agentURI ? (
        <a
          href={String(agentURI)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-emerald-400"
        >
          [metadata]
        </a>
      ) : null}
    </div>
  );
}
