"use client";

import Link from "next/link";

const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "Open", color: "bg-emerald-500/20 text-emerald-400" },
  1: { label: "Accepted", color: "bg-blue-500/20 text-blue-400" },
  2: { label: "Submitted", color: "bg-yellow-500/20 text-yellow-400" },
  3: { label: "Completed", color: "bg-green-500/20 text-green-400" },
  4: { label: "Disputed", color: "bg-red-500/20 text-red-400" },
  5: { label: "Cancelled", color: "bg-gray-500/20 text-gray-400" },
  6: { label: "Expired", color: "bg-gray-500/20 text-gray-400" },
};

interface TaskCardProps {
  id: bigint;
  title: string;
  description: string;
  location: string;
  reward: bigint;
  deadline: bigint;
  status: number;
  agent: string;
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
}: TaskCardProps) {
  const statusInfo = STATUS_LABELS[status] || STATUS_LABELS[0];
  const rewardFormatted = (Number(reward) / 1e6).toFixed(2);
  const deadlineDate = new Date(Number(deadline) * 1000);
  const isExpired = deadlineDate < new Date() && status === 0;

  return (
    <Link href={`/tasks/${id.toString()}`}>
      <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-gray-600 transition cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition line-clamp-1">
            {title}
          </h3>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full shrink-0 ml-2 ${
              isExpired ? STATUS_LABELS[6].color : statusInfo.color
            }`}
          >
            {isExpired ? "Expired" : statusInfo.label}
          </span>
        </div>

        <p className="text-sm text-gray-400 mb-4 line-clamp-2">
          {description}
        </p>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-gray-500">
            <span>📍</span>
            <span className="line-clamp-1">{location}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <span>⏰</span>
            <span>{deadlineDate.toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700/50">
          <span className="text-xs text-gray-500">
            by {agent.slice(0, 6)}...{agent.slice(-4)}
          </span>
          <span className="text-lg font-bold text-emerald-400">
            ${rewardFormatted} <span className="text-xs text-gray-500">USDC</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
