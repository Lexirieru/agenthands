"use client";

const CHAIN_INFO: Record<number, { name: string; logo: string; color: string }> = {
  84532: {
    name: "Base Sepolia",
    logo: "https://avatars.githubusercontent.com/u/108554348?s=200&v=4",
    color: "border-blue-500/30 bg-blue-500/10",
  },
  11142220: {
    name: "Celo Sepolia",
    logo: "https://avatars.githubusercontent.com/u/37552875?s=200&v=4",
    color: "border-yellow-500/30 bg-yellow-500/10",
  },
};

export function getChainInfo(chainId: number) {
  return CHAIN_INFO[chainId] || { name: `Chain ${chainId}`, logo: "", color: "border-gray-500/30 bg-gray-500/10" };
}

export default function ChainBadge({ chainId, size = "sm" }: { chainId: number; size?: "sm" | "md" }) {
  const info = getChainInfo(chainId);
  const sizeClass = size === "md" ? "h-5 w-5" : "h-4 w-4";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${info.color}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={info.logo} alt={info.name} className={`${sizeClass} rounded-full`} />
      <span className="text-gray-300">{info.name}</span>
    </span>
  );
}
