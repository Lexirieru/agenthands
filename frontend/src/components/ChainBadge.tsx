"use client";

const CHAIN_INFO: Record<number, { name: string; logo: string; color: string }> = {
  84532: {
    name: "Base",
    logo: "https://avatars.githubusercontent.com/u/108554348?s=200&v=4",
    color: "border-blue-300 bg-blue-50 text-blue-700",
  },
  11142220: {
    name: "Celo",
    logo: "https://avatars.githubusercontent.com/u/37552875?s=200&v=4",
    color: "border-yellow-300 bg-yellow-50 text-yellow-700",
  },
};

export function getChainInfo(chainId: number) {
  return CHAIN_INFO[chainId] || { name: `Chain ${chainId}`, logo: "", color: "border-[#F5DEC8] bg-[#FFF2E8] text-[#A07858]" };
}

export default function ChainBadge({ chainId, size = "sm" }: { chainId: number; size?: "sm" | "md" }) {
  const info = getChainInfo(chainId);
  const sizeClass = size === "md" ? "h-5 w-5" : "h-4 w-4";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-label ${info.color}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={info.logo} alt={info.name} className={`${sizeClass} rounded-full`} />
      <span>{info.name}</span>
    </span>
  );
}
