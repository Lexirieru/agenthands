"use client";

import Link from "next/link";
import { Clock, Coins, MapPin } from "lucide-react";
import ChainBadge from "./ChainBadge";
import { formatUSDC, getStatusDisplay, truncateAddress } from "@/lib/utils/format";

interface TaskCardProps {
  id: bigint;
  title: string;
  description: string;
  location: string;
  reward: bigint;
  deadline: bigint;
  status: number;
  agent: string;
  chainId?: number;
}

export default function TaskCard({
  id,
  title,
  description,
  location,
  reward,
  deadline,
  status,
  agent,
  chainId,
}: TaskCardProps) {
  const statusInfo = getStatusDisplay(status);
  const deadlineDate = new Date(Number(deadline) * 1000);
  const isExpired = deadlineDate < new Date() && status === 0;

  return (
    <Link href={`/tasks/${id.toString()}${chainId ? `?chain=${chainId}` : ""}`}>
      <div className="bg-white border border-[#F5DEC8] rounded-xl p-5 hover:border-[#FF8C42] transition-all duration-200 cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-[#1A0F08] font-semibold text-lg font-heading group-hover:text-[#D4700A] transition-colors line-clamp-1">
            {title}
          </h3>
          <span className={`text-xs font-medium font-label px-2 py-1 rounded-full bg-[#FFF2E8] whitespace-nowrap ${
            isExpired ? "text-gray-500" : statusInfo.color
          }`}>
            {isExpired ? "Expired" : statusInfo.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-[#6B5040] text-sm mb-4 line-clamp-2">
          {description}
        </p>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#A07858] font-label">
          <div className="flex items-center gap-1">
            <Coins size={14} className="text-[#D4700A]" />
            <span className="text-[#1A0F08] font-medium">${formatUSDC(reward)} USDC</span>
          </div>

          <div className="flex items-center gap-1">
            <MapPin size={14} />
            <span className="line-clamp-1 max-w-[120px]">{location}</span>
          </div>

          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span className={isExpired ? "text-red-400" : ""}>
              {isExpired ? "Expired" : deadlineDate.toLocaleDateString()}
            </span>
          </div>

          <div className="sm:ml-auto flex items-center gap-2">
            {chainId && <ChainBadge chainId={chainId} />}
            <span className="text-[#A07858]">{truncateAddress(agent)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
