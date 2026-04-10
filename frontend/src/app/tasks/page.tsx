"use client";

import { useState, useEffect, useRef } from "react";
import { createPublicClient, http } from "viem";
import { Search } from "lucide-react";
import gsap from "gsap";
import { AGENTHANDS_ADDRESS, CHAIN } from "@/config";
import AgentHandsABI from "@/abi/AgentHands.json";
import TaskCard from "@/components/TaskCard";
import SwipeStack from "@/components/SwipeStack";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { TaskData } from "@/types/task";

const client = createPublicClient({
  chain: CHAIN,
  transport: http(CHAIN.rpcUrls.default.http[0]),
});

const statusFilters: { label: string; value: number | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: 0 },
  { label: "Accepted", value: 1 },
  { label: "Submitted", value: 2 },
  { label: "Completed", value: 3 },
];

async function fetchAllTasks(): Promise<TaskData[]> {
  try {
    const count = (await client.readContract({
      address: AGENTHANDS_ADDRESS,
      abi: AgentHandsABI,
      functionName: "taskCount",
    })) as bigint;

    const tasks: TaskData[] = [];
    for (let i = BigInt(1); i <= count; i++) {
      const task = (await client.readContract({
        address: AGENTHANDS_ADDRESS,
        abi: AgentHandsABI,
        functionName: "getTask",
        args: [i],
      })) as TaskData;
      tasks.push({ ...task, id: i });
    }
    return tasks;
  } catch {
    return [];
  }
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    async function loadTasks() {
      setIsLoading(true);
      const results = await fetchAllTasks();
      const sorted = results.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      setTasks(sorted);
      setIsLoading(false);
    }
    loadTasks();
  }, []);

  // Desktop GSAP animation
  useEffect(() => {
    if (!isMobile && !isLoading && gridRef.current) {
      const ctx = gsap.context(() => {
        gsap.from(".task-card", {
          opacity: 0,
          y: 30,
          duration: 0.4,
          stagger: 0.05,
          ease: "power2.out",
        });
      }, gridRef);
      return () => ctx.revert();
    }
  }, [isMobile, isLoading, tasks]);

  const filteredTasks = tasks
    .filter((t) => filter === "all" || Number(t.status) === filter)
    .filter(
      (t) =>
        !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.location.toLowerCase().includes(search.toLowerCase())
    );

  // ── Mobile: TikTok swipe feed ──
  if (isMobile) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#D4700A]/20 border-t-[#D4700A] rounded-full animate-spin" />
          </div>
        ) : (
          <SwipeStack tasks={filteredTasks} />
        )}
      </div>
    );
  }

  // ── Desktop: classic grid layout ──
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-heading tracking-tight text-[#5C2D0A] mb-8">
        Browse Tasks
      </h1>

      {/* Filters */}
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

      {/* Task Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
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
          {filteredTasks.map((task, i) => (
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
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
