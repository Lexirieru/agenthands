'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

/** Reusable pagination bar with prev/next and page indicator. */
export default function PaginationBar({ currentPage, totalPages, onPrev, onNext }: PaginationBarProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-4 mt-8">
      <button
        onClick={onPrev}
        disabled={currentPage === 1}
        className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium font-label transition-colors bg-[var(--card)] text-[#8B4513] hover:text-[#5C2D0A] disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--border)]"
      >
        <ChevronLeft size={16} />
        Prev
      </button>
      <span className="text-sm font-label text-[#8B4513]">
        Page <span className="font-bold text-[#5C2D0A]">{currentPage}</span> of {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium font-label transition-colors bg-[var(--card)] text-[#8B4513] hover:text-[#5C2D0A] disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--border)]"
      >
        Next
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
