'use client';
import { useState, useEffect, useRef, useMemo } from "react";
import { Search, X } from "lucide-react";
import gsap from "gsap";
import TaskCard from "@/components/TaskCard";
import SwipeStack from "@/components/SwipeStack";
import PaginationBar from "@/components/PaginationBar";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAllTasks } from "@/hooks/useTasks";

// ── Pagination ──────────────────────────────────────────
const ITEMS_PER_PAGE = 12; // 3 cols × 4 rows

function useNowSeconds(intervalMs = 30000) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const statusFilters: { label: string; value: number | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: 0 },
  { label: "Accepted", value: 1 },
  { label: "Submitted", value: 2 },
  { label: "Completed", value: 3 },
];

export default function TasksPage() {
  const [filter, setFilter] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const nowSec = useNowSeconds();

  const { data: rawTasks = [], isLoading } = useAllTasks();

  const tasks = useMemo(
    () => [...rawTasks].sort((a, b) => Number(b.createdAt) - Number(a.createdAt)),
    [rawTasks]
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => { setCurrentPage(1); }, [filter]);
  useEffect(() => { setCurrentPage(1); }, [search]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isMobile) return;
      if (e.key === 'ArrowLeft') setCurrentPage(p => Math.max(1, p - 1));
      if (e.key === 'ArrowRight') setCurrentPage(p => Math.min(totalPages, p + 1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isMobile, totalPages]);

  // Desktop GSAP animation
  useEffect(() => {
    if (isMounted && !isMobile && !isLoading && gridRef.current && tasks.length > 0) {
      const ctx = gsap.context(() => {
        gsap.from(".task-card", {
          opacity: 0,
          y: 20,
          duration: 0.4,
          stagger: 0.05,
          ease: "power2.out",
        });
      }, gridRef);
      return () => ctx.revert();
    }
  }, [isMounted, isMobile, isLoading, tasks]);

  const filteredTasks = tasks
    .filter((t) => filter === "all" || Number(t.status) === filter)
    .filter(
      (t) =>
        !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.location.toLowerCase().includes(search.toLowerCase())
    );

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / ITEMS_PER_PAGE));
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (!isMounted) return null;

  // ── Mobile View: Swipe + Integrated Search/Filter ──
  if (isMobile) {
    const displayTasks = filteredTasks.filter(t => Number(t.status) === 0 && Number(t.deadline) > nowSec);

    return (
      <div className="flex flex-col flex-1 min-h-0 relative">
        {showMobileFilters && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end">
            <div className="w-full bg-[#FCF8F4] rounded-t-3xl p-6 pb-12 animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-heading text-[#5C2D0A]">Filters</h3>
                <button onClick={() => setShowMobileFilters(false)}>
                  <X size={24} className="text-[#8B4513]" />
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-sm font-label text-[#8B4513]">Status</p>
                <div className="flex flex-wrap gap-2">
                  {statusFilters.map((f) => (
                    <button
                      key={String(f.value)}
                      onClick={() => {
                        setFilter(f.value);
                        setShowMobileFilters(false);
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        filter === f.value
                          ? "bg-[#D4700A] text-white shadow-lg shadow-[#D4700A]/30"
                          : "bg-white text-[#8B4513] border border-[#D4700A]/20"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full mt-8 bg-[#5C2D0A] text-white py-3 rounded-2xl font-bold shadow-xl"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#D4700A]/20 border-t-[#D4700A] rounded-full animate-spin" />
          </div>
        ) : displayTasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center bg-black/20">
             <p className="text-white font-heading text-xl">Empty Space</p>
             <p className="text-white/60 text-sm mt-2">No tasks match your filters or search.</p>
             <button onClick={() => {setFilter("all"); setSearch("");}} className="mt-4 text-[#D4700A] font-bold">Clear All</button>
          </div>
        ) : (
          <SwipeStack tasks={displayTasks} />
        )}
      </div>
    );
  }

  // ── Desktop Layout ──
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-heading tracking-tight text-[#5C2D0A] mb-8">
        Browse Tasks
      </h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B4513]" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--card-solid)] border border-[var(--border)] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#5C2D0A] placeholder-[#8B4513] focus:outline-none focus:border-[#D4700A] font-label"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilters.map((f) => {
            const count = f.value === 'all'
              ? tasks.length
              : tasks.filter(t => Number(t.status) === f.value).length;
            return (
              <button key={String(f.value)} onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium font-label transition-colors ${
                  filter === f.value ? 'bg-[#5C2D0A] text-white' : 'bg-[var(--card)] text-[#8B4513] hover:text-[#5C2D0A]'
                }`}
              >
                {f.label} <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {!isLoading && filteredTasks.length > 0 && (
        <p className="text-xs font-label text-[#8B4513] mb-4">
          Showing{' '}
          <span className="font-semibold text-[#5C2D0A]">
            {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredTasks.length)}
          </span>{' '}
          of <span className="font-semibold text-[#5C2D0A]">{filteredTasks.length}</span> tasks
        </p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
            <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 animate-pulse h-40" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-20 text-[#8B4513]">
          <p className="text-lg font-heading">No tasks found</p>
          <p className="text-sm mt-2">Try adjusting your filters or check back later.</p>
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedTasks.map((task, i) => (
            <div key={task.id?.toString() || i} className="task-card">
              <TaskCard
                id={task.id || BigInt(i + 1)}
                title={task.title}
                description={task.description}
                location={task.location}
                reward={task.reward}
                deadline={task.deadline}
                status={Number(task.status)}
                agent={task.agent}
                paymentToken={task.paymentToken}
              />
            </div>
          ))}
        </div>
      )}
      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
        onNext={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
        onPageSelect={(p) => setCurrentPage(p)}
      />
    </div>
  );
}
