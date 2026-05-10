"use client";

import Link from "next/link";
import { MapPin, Clock, ArrowRight, Share2 } from "lucide-react";
import {
  formatTokenAmount,
  getStatusDisplay,
  tokenInfoForAddress,
  truncateAddress,
} from "@/lib/utils/format";
import type { TaskData } from "@/types/task";

interface Props {
  task: TaskData;
  index: number;
  total: number;
}

export default function SwipeCard({ task, index, total }: Props) {
  const status = Number(task.status);
  const statusInfo = getStatusDisplay(status);
  const deadlineDate = new Date(Number(task.deadline) * 1000);
  const isExpired = deadlineDate < new Date() && status === 0;
  const tokenInfo = tokenInfoForAddress(task.paymentToken);
  const rewardFormatted = formatTokenAmount(task.reward, tokenInfo.decimals);

  const statusStyle: Record<number, string> = {
    0: "bg-emerald-100 text-emerald-700",
    1: "bg-blue-100 text-blue-700",
    2: "bg-amber-100 text-amber-700",
    3: "bg-emerald-100 text-emerald-800",
    4: "bg-red-100 text-red-700",
    5: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="h-full w-full flex flex-col px-3 pt-2 pb-2 bg-[#F5E6D3]">

      {/* Card */}
      <div className="flex-1 flex flex-col bg-[var(--card-solid)] rounded-2xl overflow-hidden shadow-sm border border-[var(--border)]">

        {/* Top: reward + status */}
        <div className="p-5 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-semibold text-[#2C1810] tracking-tight">
                {tokenInfo.isStablecoin ? `$${rewardFormatted}` : rewardFormatted}
              </span>
              {tokenInfo.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tokenInfo.logo} alt={tokenInfo.symbol} className="h-7 w-7" />
              )}
              <span className="text-sm text-[#9B8574]">{tokenInfo.symbol}</span>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              isExpired ? "bg-gray-100 text-gray-500" : (statusStyle[status] || statusStyle[0])
            }`}>
              {isExpired ? "Expired" : statusInfo.label}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-[17px] font-semibold text-[#2C1810] leading-snug mb-2">
            {task.title}
          </h2>

          {/* Description */}
          <p className="text-[14px] text-[#7A6B5D] leading-relaxed line-clamp-3">
            {task.description}
          </p>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom meta */}
        <div className="px-5 pb-5">
          <div className="border-t border-[var(--border)]/50 pt-4 space-y-2.5">
            <div className="flex items-center gap-2 text-[13px] text-[#7A6B5D]">
              <MapPin size={14} className="text-[#C47A2A] shrink-0" />
              <span className="truncate">{task.location}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px] text-[#7A6B5D]">
                <Clock size={14} className={isExpired ? "text-red-400" : "text-[#C47A2A]"} />
                <span>{isExpired ? "Expired" : deadlineDate.toLocaleDateString()}</span>
              </div>
              <span className="text-[12px] text-[#B0A090] font-mono">{truncateAddress(task.agent)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2.5 mt-2">
        {status === 0 && !isExpired ? (
          <Link
            href={`/tasks/${task.id?.toString() || "0"}`}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#5C2D0A] text-white font-semibold text-[15px] active:scale-[0.98] transition-transform"
          >
            Accept Task <ArrowRight size={16} />
          </Link>
        ) : (
          <Link
            href={`/tasks/${task.id?.toString() || "0"}`}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[var(--card-solid)] text-[#5C2D0A] font-semibold text-[15px] border border-[var(--border)] active:scale-[0.98] transition-transform"
          >
            View Details <ArrowRight size={16} />
          </Link>
        )}
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: task.title,
                text: task.description,
                url: window.location.origin + `/tasks/${task.id?.toString()}`,
              }).catch(() => {});
            }
          }}
          className="w-[52px] flex items-center justify-center rounded-xl bg-[var(--card-solid)] border border-[var(--border)] active:scale-[0.95] transition-transform"
        >
          <Share2 size={18} className="text-[#7A6B5D]" />
        </button>
      </div>
    </div>
  );
}
