"use client";

import { useState, useMemo } from "react";
import { formatUSDC, getStatusDisplay, truncateAddress } from "@/lib/utils/format";
import { MapPin, Clock } from "lucide-react";
import Link from "next/link";
import { useAllTasks } from "@/hooks/useTasks";

const statusFilters = [
  { label: "All", value: "all" as const },
  { label: "Open", value: 0 },
  { label: "Active", value: 1 },
  { label: "Review", value: 2 },
  { label: "Done", value: 3 },
];

export default function SearchPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<number | "all">("all");

  const { data: rawTasks = [], isLoading } = useAllTasks();

  const tasks = useMemo(
    () => [...rawTasks].sort((a, b) => Number(b.createdAt) - Number(a.createdAt)),
    [rawTasks]
  );

  const filtered = tasks
    .filter((t) => filter === "all" || Number(t.status) === filter)
    .filter(
      (t) =>
        !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.location.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="px-4 pt-4 pb-20 md:py-8 md:px-6 lg:px-8 mx-auto w-full max-w-7xl">
      <h1 className="text-xl md:text-4xl font-semibold text-[#5C2D0A] mb-4 md:mb-8 font-heading">Explore Tasks</h1>

      <input
        type="text"
        placeholder="Search tasks..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-[var(--card-solid)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[#5C2D0A] placeholder-[#8B4513] mb-4 outline-none focus:border-[#D4700A]"
      />

      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {statusFilters.map((f) => (
          <button
            key={String(f.value)}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors ${
              filter === f.value
                ? "bg-[#5C2D0A] text-white"
                : "bg-[var(--card)] text-[#8B4513] border border-[var(--border)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#D4700A]/20 border-t-[#D4700A] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((task) => {
            const status = Number(task.status);
            const statusInfo = getStatusDisplay(status);
            const deadlineDate = new Date(Number(task.deadline) * 1000);
            const isExpired = deadlineDate < new Date() && status === 0;
            return (
              <Link href={`/tasks/${task.id.toString()}`} key={task.id.toString()}>
                <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl p-4 active:border-[#D4700A] transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--card)] text-[#8B4513] text-xs font-medium border border-[var(--border)]">
                      {isExpired ? "Expired" : statusInfo.label}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-[#8B4513]">
                      <Clock size={12} />
                      <span className={isExpired ? "text-red-500" : ""}>{isExpired ? "Expired" : deadlineDate.toLocaleDateString()}</span>
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-[#5C2D0A] mb-2 leading-snug">
                    {task.title}
                  </h3>
                  <p className="text-[#8B4513] text-xs line-clamp-2 mb-3">{task.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <MapPin size={12} className="text-[#D4700A]" />
                      <span className="text-xs text-[#8B4513] line-clamp-1">{task.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <img src="/usdclogo.png" alt="USDC" className="h-4 w-4" />
                      <span className="text-sm font-bold text-[#D4700A]">${formatUSDC(task.reward)}</span>
                    </div>
                  </div>
                  <p className="text-[#8B4513] text-[10px] mt-2 font-mono">{truncateAddress(task.agent)}</p>
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-[#8B4513] text-center py-12">No tasks found</p>
          )}
        </div>
      )}
    </div>
  );
}
