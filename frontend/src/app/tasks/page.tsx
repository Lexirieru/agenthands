"use client";

import { useState, useEffect, useRef } from "react";
import { createPublicClient, http } from "viem";
import { baseSepolia, celoAlfajores } from "viem/chains";
import { Search } from "lucide-react";
import gsap from "gsap";
import { AGENTHANDS_ADDRESS } from "@/config";
import AgentHandsABI from "@/abi/AgentHands.json";
import TaskCard from "@/components/TaskCard";
import ChainBadge from "@/components/ChainBadge";

interface TaskData {
  id: bigint;
  agent: string;
  worker: string;
  paymentToken: string;
  reward: bigint;
  deadline: bigint;
  completionDeadline: bigint;
  title: string;
  description: string;
  location: string;
  proofCID: string;
  status: number;
  createdAt: bigint;
  chainId: number;
}

const CHAINS = [
  {
    id: 84532,
    name: "Base Sepolia",
    client: createPublicClient({
      chain: baseSepolia,
      transport: http("https://sepolia.base.org"),
    }),
  },
  {
    id: 11142220,
    name: "Celo Sepolia",
    client: createPublicClient({
      chain: { ...celoAlfajores, id: 11142220 as number, name: "Celo Sepolia" },
      transport: http("https://forno.celo-sepolia.celo-testnet.org"),
    }),
  },
];

const statusFilters: { label: string; value: number | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: 0 },
  { label: "Accepted", value: 1 },
  { label: "Submitted", value: 2 },
  { label: "Completed", value: 3 },
];

async function fetchTasksFromChain(chain: (typeof CHAINS)[number]): Promise<TaskData[]> {
  try {
    const count = await chain.client.readContract({
      address: AGENTHANDS_ADDRESS,
      abi: AgentHandsABI,
      functionName: "taskCount",
    }) as bigint;

    const tasks: TaskData[] = [];
    for (let i = BigInt(1); i <= count; i++) {
      const task = await chain.client.readContract({
        address: AGENTHANDS_ADDRESS,
        abi: AgentHandsABI,
        functionName: "getTask",
        args: [i],
      }) as TaskData;
      tasks.push({ ...task, chainId: chain.id });
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
  const [chainFilter, setChainFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadTasks() {
      setIsLoading(true);
      const results = await Promise.all(CHAINS.map(fetchTasksFromChain));
      const allTasks = results.flat().sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      setTasks(allTasks);
      setIsLoading(false);
    }
    loadTasks();
  }, []);

  useEffect(() => {
    if (!isLoading && gridRef.current) {
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
  }, [isLoading, tasks]);

  const filteredTasks = tasks
    .filter((t) => filter === "all" || Number(t.status) === filter)
    .filter((t) => !chainFilter || t.chainId === chainFilter)
    .filter((t) =>
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.location.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-heading tracking-tight text-[#1A0F08] mb-8">
        Browse Tasks
      </h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A07858]" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-[#F5DEC8] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#1A0F08] placeholder-[#A07858] focus:outline-none focus:border-[#FF8C42] font-label"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {statusFilters.map((f) => (
            <button
              key={String(f.value)}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-label transition-colors ${
                filter === f.value
                  ? "bg-[#1A0F08] text-white"
                  : "bg-[#FFF2E8] text-[#A07858] hover:text-[#1A0F08]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chain filter */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs text-[#A07858] font-label">Chain:</span>
        <button
          onClick={() => setChainFilter(null)}
          className={`px-3 py-1 rounded-full text-xs font-label transition ${
            !chainFilter
              ? "bg-[#1A0F08] text-white"
              : "bg-[#FFF2E8] text-[#A07858] hover:text-[#1A0F08]"
          }`}
        >
          All ({tasks.length})
        </button>
        {CHAINS.map((chain) => {
          const count = tasks.filter((t) => t.chainId === chain.id).length;
          return (
            <button
              key={chain.id}
              onClick={() => setChainFilter(chain.id === chainFilter ? null : chain.id)}
              className={`transition ${chainFilter === chain.id ? "ring-1 ring-[#FF8C42] rounded-full" : "opacity-70 hover:opacity-100"}`}
            >
              <ChainBadge chainId={chain.id} />
              <span className="ml-1 text-xs text-[#A07858]">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Task Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#FFF2E8] border border-[#F5DEC8] rounded-xl p-5 animate-pulse h-40" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-20 text-[#A07858]">
          <p className="text-lg font-heading">No tasks found</p>
          <p className="text-sm mt-2">Try adjusting your filters or check back later.</p>
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task, i) => (
            <div key={`${task.chainId}-${task.id?.toString() || i}`} className="task-card">
              <TaskCard
                id={task.id || BigInt(i + 1)}
                title={task.title}
                description={task.description}
                location={task.location}
                reward={task.reward}
                deadline={task.deadline}
                status={Number(task.status)}
                agent={task.agent}
                chainId={task.chainId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
