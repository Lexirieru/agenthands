"use client";

import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import {
  formatRewardDisplay,
  getStatusDisplay,
  tokenInfoForAddress,
  truncateAddress,
} from "@/lib/utils/format";

/**
 * Compact task card for the AgentHands desktop grid on Celo.
 *
 * Renders on-chain task data (title, description, location, reward, deadline,
 * status) as a clickable link to `/tasks/:id`. The `paymentToken` address
 * drives reward formatting: stablecoins (USDC/USDT/USDm) show a `$` prefix,
 * while volatile tokens (CELO) show the amount + symbol without a `$`.
 *
 * Treats an Open task whose `deadline` is in the past as "Expired" on the
 * client side without waiting for an on-chain `claimExpired` call, so the
 * card status badge stays accurate even before the transaction lands.
 */
interface TaskCardProps {
  /** On-chain task ID (1-indexed uint256 from the AgentHands contract). */
  id: bigint;
  /** Short task title displayed as the card heading. */
  title: string;
  /** Full task description shown as a two-line clamp below the title. */
  description: string;
  /** Physical or logical task location (searchable on the task-list page). */
  location: string;
  /** Raw reward amount in the payment token's native decimals. */
  reward: bigint;
  /** Unix timestamp (seconds) after which the task is treated as Expired client-side. */
  deadline: bigint;
  /** Numeric TaskStatus enum value (0=Open … 6=Expired). */
  status: number;
  /** Celo address of the AI agent that posted the task, shown truncated in the footer. */
  agent: string;
  /** Payment token address — drives reward formatting + logo. Defaults to USDC. */
  paymentToken?: string;
}

/** Returns Tailwind bg+text classes for each task status badge. */
function statusBadgeClass(status: number): string {
  switch (status) {
    case 0: return 'bg-green-100 text-green-700';    // Open
    case 1: return 'bg-blue-100 text-blue-700';     // Accepted
    case 2: return 'bg-orange-100 text-orange-700'; // Submitted
    case 3: return 'bg-gray-100 text-gray-600';     // Completed
    case 4: return 'bg-red-100 text-red-700';       // Disputed
    case 5: return 'bg-gray-100 text-gray-500';     // Cancelled
    case 6: return 'bg-gray-100 text-gray-500';     // Expired
    default: return 'bg-gray-100 text-gray-500';
  }
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
      <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-xl p-4 md:p-5 hover:border-[#D4700A] hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-[#5C2D0A] font-semibold text-base md:text-lg font-heading group-hover:text-[#D4700A] transition-colors line-clamp-1">
            {title}
          </h3>
          <span className={`text-xs font-medium font-label px-2 py-1 rounded-full whitespace-nowrap ${
            isExpired
              ? 'bg-gray-100 text-gray-500'
              : statusBadgeClass(Number(status))
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
