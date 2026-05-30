'use client';

/** @module AgentBadge — ERC-8004 on-chain identity and reputation badge for Celo AI agents. */
import { useReadContract } from 'wagmi';
import { HelpCircle, ShieldCheck, Star } from 'lucide-react';
import { IDENTITY_REGISTRY, REPUTATION_REGISTRY, ERC8004_CHAIN_ID } from '@/config/erc8004';
import IdentityRegistryABI from '@/abi/IdentityRegistry.json';
import ReputationRegistryABI from '@/abi/ReputationRegistry.json';

/**
 * Show an ERC-8004 identity and reputation badge for a Celo AI agent address.
 *
 * Reads from two registries deployed on Celo mainnet (chain ID 42220):
 *   - Identity Registry:    `0x8004A818BFB912233c491871b3d84c89A494BD9e`
 *   - Reputation Registry:  `0x8004B663056A597Dffe9eCcC1965A193B7388713`
 *
 * If the agent holds at least one Identity NFT (`balanceOf > 0`), the badge
 * renders as "ERC-8004 Verified" (green) with a review count from the
 * Reputation Registry and a link to the agent's on-chain metadata URI.
 * Unverified agents show an "Unverified Agent" chip instead.
 *
 * @since 1.0.0
 * @see IDENTITY_REGISTRY — `0x8004A818BFB912233c491871b3d84c89A494BD9e` on Celo mainnet
 */
/**
 * Props for `AgentBadge`.
 * @since 1.0.0
 */
interface AgentBadgeProps {
  /** Celo mainnet wallet address of the AI agent to look up in the ERC-8004 identity and reputation registries. */
  agentAddress: string;
}

export default function AgentBadge({ agentAddress }: AgentBadgeProps) {
  const { data: balance } = useReadContract({
    address: IDENTITY_REGISTRY,
    abi: IdentityRegistryABI,
    functionName: 'balanceOf',
    args: [agentAddress as `0x${string}`],
    chainId: ERC8004_CHAIN_ID,
  });

  const { data: agentTokenId } = useReadContract({
    address: IDENTITY_REGISTRY,
    abi: IdentityRegistryABI,
    functionName: 'tokenOfOwnerByIndex',
    args: [agentAddress as `0x${string}`, BigInt(0)],
    chainId: ERC8004_CHAIN_ID,
    query: { enabled: !!balance && Number(balance) > 0 },
  });

  const { data: agentURI } = useReadContract({
    address: IDENTITY_REGISTRY,
    abi: IdentityRegistryABI,
    functionName: 'tokenURI',
    args: [agentTokenId as bigint],
    chainId: ERC8004_CHAIN_ID,
    query: { enabled: !!agentTokenId },
  });

  const { data: clients } = useReadContract({
    address: REPUTATION_REGISTRY,
    abi: ReputationRegistryABI,
    functionName: 'getClients',
    args: [agentTokenId as bigint],
    chainId: ERC8004_CHAIN_ID,
    query: { enabled: !!agentTokenId },
  });

  const isVerified = !!balance && Number(balance) > 0;
  const reviewCount = Array.isArray(clients) ? clients.length : 0;

  if (!isVerified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--card)] text-[#8B4513] text-xs border border-[var(--border)]">
        <HelpCircle size={12} /> Unverified Agent
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-900/10 text-green-800 text-xs font-medium border border-green-400/30">
        <ShieldCheck size={12} /> ERC-8004 Verified
      </span>
      {reviewCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--card)] text-[#D4700A] text-xs border border-[var(--border)]">
          <Star size={12} /> {reviewCount} review{reviewCount > 1 ? 's' : ''}
        </span>
      )}
      {agentURI ? (
        <a
          href={String(agentURI)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#8B4513] hover:text-[#D4700A]"
        >
          [metadata]
        </a>
      ) : null}
    </div>
  );
}
