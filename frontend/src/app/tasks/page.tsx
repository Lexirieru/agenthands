'use client';
import { useState, useEffect, useRef } from "react";
import { createPublicClient, http, fallback } from "viem";
import { Search, SlidersHorizontal, X } from "lucide-react";
import gsap from "gsap";
import { AGENTHANDS_ADDRESS, CHAIN } from "@/config";
import AgentHandsABI from "@/abi/AgentHands.json";
import TaskCard from "@/components/TaskCard";
import SwipeStack from "@/components/SwipeStack";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { TaskData } from "@/types/task";

// KONSISTEN nembak ke RPC Sepolia buat fetch data
// Menggunakan beberapa RPC alternatif untuk menghindari "0x" data return
const publicClient = createPublicClient({
  chain: CHAIN,
  transport: fallback([
    http("https://alfajores-forno.celo-testnet.org"), // Primary Alfajores RPC
    http("https://forno.celo-sepolia.celo-testnet.org"),
    http("https://rpc.ankr.com/celo_alfajores"), // Ankr fallback
  ]),
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
    // 1. Ambil taskCount
    const count = (await publicClient.readContract({
      address: AGENTHANDS_ADDRESS as `0x${string}`,
      abi: AgentHandsABI,
      functionName: "taskCount",
    })) as bigint;

    const totalTasksCount = Number(count);
    if (totalTasksCount === 0) return [];

    // 2. Multicall untuk ambil SEMUA data task sekaligus
    const contracts = [];
    for (let i = 1; i <= totalTasksCount; i++) {
      contracts.push({
        address: AGENTHANDS_ADDRESS as `0x${string}`,
        abi: AgentHandsABI,
        functionName: "getTask",
        args: [BigInt(i)],
      });
    }

    const results = await publicClient.multicall({
      // @ts-ignore
      contracts,
      allowFailure: true,
    });

    return results
      .map((res, i) => {
        if (res.status === "success") {
          const task = res.result as any;
          return {
            ...task,
            id: BigInt(i + 1),
            status: Number(task.status)
          } as TaskData;
        }
        return null;
      })
      .filter((t): t is TaskData => t !== null);
  } catch (error) {
    console.error("Fetch tasks error:", error);
    return [];
  }
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    setIsMounted(true);
    async function loadTasks() {
      setIsLoading(true);
      try {
        const results = await fetchAllTasks();
        const sorted = results.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
        setTasks(sorted);
      } catch (err) {
        console.error("Load tasks failed:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadTasks();
  }, []);

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

  if (!isMounted) return null;

  // ── Mobile View: Swipe + Integrated Search/Filter ──
  if (isMobile) {
    const now = Date.now() / 1000;
    const displayTasks = filteredTasks.filter(t => Number(t.status) === 0 && Number(t.deadline) > now);

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
