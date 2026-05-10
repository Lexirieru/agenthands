"use client";

import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import {
  formatRewardDisplay,
  getStatusDisplay,
  tokenInfoForAddress,
  truncateAddress,
} from "@/lib/utils/format";

interface TaskCardProps {
  id: bigint;
  title: string;
  description: string;
  location: string;
  reward: bigint;
  deadline: bigint;
  status: number;
  agent: string;
  /** Payment token address — drives reward formatting + logo. Defaults to USDC. */
  paymentToken?: string;
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
  paymentToken,
}: TaskCardProps) {
  const tokenInfo = tokenInfoForAddress(paymentToken);
  const rewardLabel = formatRewardDisplay(reward, paymentToken);
  const statusInfo = getStatusDisplay(status);
  const deadlineDate = new Date(Number(deadline) * 1000);
  const isExpired = deadlineDate < new Date() && status === 0;

  return (
    <Link href={`/tasks/${id.toString()}`}>
      <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-xl p-4 md:p-5 hover:border-[#D4700A] active:scale-[0.98] transition-all duration-200 cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-[#5C2D0A] font-semibold text-base md:text-lg font-heading group-hover:text-[#D4700A] transition-colors line-clamp-1">
            {title}
          </h3>
          <span className={`text-xs font-medium font-label px-2 py-1 rounded-full bg-[var(--card)] whitespace-nowrap ${
            isExpired ? "text-gray-500" : statusInfo.color
          }`}>
            {isExpired ? "Expired" : statusInfo.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-[#5C2D0A] text-sm mb-3 line-clamp-2">{description}</p>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#8B4513] font-label">
          <div className="flex items-center gap-1">
            {tokenInfo.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tokenInfo.logo} alt={tokenInfo.symbol} className="h-4 w-4" />
            )}
            <span className="text-[#5C2D0A] font-medium">{rewardLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin size={12} />
            <span className="line-clamp-1 max-w-[100px]">{location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span className={isExpired ? "text-red-400" : ""}>
              {isExpired ? "Expired" : deadlineDate.toLocaleDateString()}
            </span>
          </div>
          <span className="ml-auto text-[#8B4513]">{truncateAddress(agent)}</span>
        </div>
      </div>
    </Link>
  );
}
