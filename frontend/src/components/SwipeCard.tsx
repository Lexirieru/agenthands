"use client";

import Link from "next/link";
import { MapPin, Clock, User } from "lucide-react";
import { formatUSDC, getStatusDisplay, truncateAddress } from "@/lib/utils/format";
import type { TaskData } from "@/types/task";

const STATUS_COLORS: Record<number, string> = {
  0: "text-green-600 bg-green-900/10 border-green-400/20",
  1: "text-blue-600 bg-blue-900/10 border-blue-400/20",
  2: "text-yellow-600 bg-yellow-900/10 border-yellow-400/20",
  3: "text-green-700 bg-green-900/15 border-green-500/20",
  4: "text-red-600 bg-red-900/10 border-red-400/20",
  5: "text-[#8B4513] bg-[var(--card)] border-[var(--border)]",
  6: "text-[#8B4513] bg-[var(--card)] border-[var(--border)]",
};

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
  const rewardFormatted = formatUSDC(task.reward);

  return (
    <div className="h-full flex flex-col px-4 py-3">
      {/* Top row */}
      <div className="flex items-center justify-between mb-1 shrink-0">
        <p className="text-4xl font-bold text-[#5C2D0A] tracking-tight">
          ${rewardFormatted}
        </p>
        <span
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${
            isExpired
              ? "text-[#8B4513] bg-[var(--card)] border-[var(--border)]"
              : STATUS_COLORS[status] || STATUS_COLORS[0]
          }`}
        >
          {isExpired ? "Expired" : statusInfo.label}
        </span>
      </div>
      <p className="text-[10px] text-[#8B4513] mb-2 shrink-0">USDC Reward</p>

      {/* Reward visual — full width accent bar */}
      <div className="flex-1 min-h-0 relative -mx-4 flex items-center justify-center">
        <div className="w-full h-full flex flex-col items-center justify-center px-8">
          <div className="w-full max-w-sm p-6 bg-[#D4700A]/10 rounded-2xl border border-[#D4700A]/20">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="https://cdn.morpho.org/assets/logos/usdc.svg"
                alt="USDC"
                className="h-12 w-12"
              />
              <div>
                <div className="text-4xl font-bold text-[#D4700A]">${rewardFormatted}</div>
                <div className="text-xs text-[#8B4513]">USDC Escrow Locked</div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#8B4513]">
              <div className="flex items-center gap-1">
                <MapPin size={12} className="text-[#D4700A]" />
                <span className="line-clamp-1">{task.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={12} className="text-[#D4700A]" />
                <span className={isExpired ? "text-red-500" : ""}>
                  {isExpired ? "Expired" : deadlineDate.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question + description */}
      <div className="mt-2 mb-3 shrink-0">
        <h2 className="text-base font-semibold text-[#5C2D0A] leading-snug mb-1">
          {task.title}
        </h2>
        <p className="text-[#8B4513] text-xs line-clamp-2">{task.description}</p>
        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-[#8B4513]">
          <User size={10} />
          <span className="font-mono">{truncateAddress(task.agent)}</span>
          <span className="text-[#D4A878]">·</span>
          <span>{index + 1}/{total}</span>
        </div>
      </div>

      {/* Action button */}
      <div className="flex gap-3 shrink-0">
        <Link
          href={`/tasks/${task.id?.toString() || "0"}`}
          className="flex-1 py-3 rounded-xl bg-[#D4700A]/10 border border-[#D4700A]/20 text-[#D4700A] font-semibold text-sm text-center active:scale-[0.97] transition-transform"
        >
          View Details
        </Link>
        {status === 0 && !isExpired && (
          <Link
            href={`/tasks/${task.id?.toString() || "0"}`}
            className="flex-1 py-3 rounded-xl bg-[#5C2D0A] border border-[#5C2D0A] text-white font-semibold text-sm text-center active:scale-[0.97] transition-transform"
          >
            Accept Task
          </Link>
        )}
      </div>
    </div>
  );
}
