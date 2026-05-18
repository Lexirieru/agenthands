'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onPageSelect: (page: number) => void;
}

/**
 * Reusable pagination bar for the Celo AgentHands desktop task grid.
 *
 * Shows prev/next buttons and up to 5 page-number buttons centered on the
 * current page (window: `[currentPage-2 … currentPage+2]`, clamped to
 * `[1…totalPages]`). Returns `null` when there is only one page, so it
 * can be placed unconditionally in the layout without an extra guard.
 *
 * Fully keyboard and screen-reader accessible: `role="navigation"`,
 * `aria-label`, `aria-current="page"`, and `disabled` on edge buttons.
 */
export default function PaginationBar({ currentPage, totalPages, onPrev, onNext, onPageSelect }: PaginationBarProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = () => {
    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <nav role="navigation" aria-label="Task pagination" className="flex items-center justify-center gap-4 mt-8">
      <button
        onClick={onPrev}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium font-label transition-colors bg-[var(--card)] text-[#8B4513] hover:text-[#5C2D0A] disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--border)]"
      >
        <ChevronLeft size={16} />
        Prev
      </button>
      <div className="flex items-center gap-1">
        {pageNumbers().map(p => (
          <button key={p} onClick={() => onPageSelect(p)}
            aria-label={`Page ${p}`}
            aria-current={p === currentPage ? 'page' : undefined}
            className={`w-8 h-8 rounded-lg text-xs font-medium font-label transition-colors ${
              p === currentPage ? 'bg-[#5C2D0A] text-white' : 'bg-[var(--card)] text-[#8B4513] hover:text-[#5C2D0A] border border-[var(--border)]'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <button
        onClick={onNext}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium font-label transition-colors bg-[var(--card)] text-[#8B4513] hover:text-[#5C2D0A] disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--border)]"
      >
        Next
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
