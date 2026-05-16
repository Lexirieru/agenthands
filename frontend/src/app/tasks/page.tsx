'use client';
import { useState, useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";
import SwipeStack from "@/components/SwipeStack";
import TaskGrid from "@/components/TaskGrid";
import TaskGridSkeleton from "@/components/TaskGridSkeleton";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAllTasks } from "@/hooks/useTasks";

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

  const filteredTasks = tasks
    .filter((t) => filter === "all" || Number(t.status) === filter)
    .filter(
      (t) =>
        !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.location.toLowerCase().includes(search.toLowerCase())
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
            className="w-full bg-[var(--card-solid)] border border-[var(--border)] rounded-lg pl-10 pr-10 py-2.5 text-sm text-[#5C2D0A] placeholder-[#8B4513] focus:outline-none focus:border-[#D4700A] font-label"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B4513] hover:text-[#5C2D0A] transition-colors"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilters.map((f) => (
            <button
              key={String(f.value)}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-label transition-colors ${
                filter === f.value
                  ? "bg-[#5C2D0A] text-white"
                  : "bg-[var(--card)] text-[#8B4513] hover:text-[#5C2D0A]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <TaskGridSkeleton count={6} />
      ) : (
        <TaskGrid
          tasks={filteredTasks}
          search={search}
          onClearFilters={() => { setFilter("all"); setSearch(""); }}
        />
      )}
    </div>
  );
}
