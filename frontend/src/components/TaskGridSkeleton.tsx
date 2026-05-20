'use client';

interface TaskGridSkeletonProps {
  /** Number of skeleton cards to render. Defaults to 12 (3×4 desktop grid). */
  count?: number;
}

/**
 * Loading skeleton for the Celo AgentHands desktop task grid.
 *
 * Renders `count` pulsing placeholder cards (Tailwind `animate-pulse`) in the
 * same 3-column responsive layout as `TaskGrid`, so the page doesn't shift
 * when real tasks arrive from the Celo RPC multicall.
 *
 * Default `count = 12` fills three full rows on a 1080 p viewport, matching
 * a typical paginated task-list response from the AgentHands contract.
 *
 * Each placeholder card has `aria-hidden="true"` so screen readers skip the
 * decorative shimmer and announce real task content once it loads.
 *
 * @param count Number of skeleton cards to render (default: 12).
 * @returns     A responsive CSS grid of pulsing placeholder cards.
 */
export default function TaskGridSkeleton({ count = 12 }: TaskGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 animate-pulse h-40"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
