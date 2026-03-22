"use client";

import Link from "next/link";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { useReadContract } from "wagmi";
import { USDC_ADDRESSES } from "@/config";
import { formatUnits } from "viem";

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export default function Navbar() {
  const { isConnected, address } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  const usdcAddress = chainId ? USDC_ADDRESSES[chainId as number] : undefined;

  const { data: rawBalance } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address && !!usdcAddress },
  });

  const usdcFormatted = rawBalance !== undefined
    ? parseFloat(formatUnits(rawBalance, 6)).toFixed(2)
    : null;

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-2xl">🤝</span>
        <span className="text-xl font-bold text-white">AgentHands</span>
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/tasks"
          className="text-gray-400 hover:text-white transition text-sm"
        >
          Browse Tasks
        </Link>
        {isConnected && (
          <>
            <Link
              href="/tasks/new"
              className="text-gray-400 hover:text-white transition text-sm"
            >
              Post Task
            </Link>
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-white transition text-sm"
            >
              Dashboard
            </Link>
            {usdcFormatted && (
              <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20">
                {usdcFormatted} USDC
              </span>
            )}
          </>
        )}
        <appkit-button />
      </div>
    </nav>
  );
}
