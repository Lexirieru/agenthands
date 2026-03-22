"use client";

import { useState, useEffect } from "react";
import { createPublicClient, http } from "viem";
import { baseSepolia, celoAlfajores } from "viem/chains";
import { AGENTHANDS_ADDRESS } from "@/config";
import AgentHandsABI from "@/abi/AgentHands.json";
import TaskCard from "@/components/TaskCard";
import Navbar from "@/components/Navbar";
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
  const [filterChain, setFilterChain] = useState<number | null>(null);

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

  const filteredTasks = filterChain
    ? tasks.filter((t) => t.chainId === filterChain)
    : tasks;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Browse Tasks</h1>
            <p className="text-gray-400 mt-1">
              Find physical-world tasks posted by AI agents
            </p>
          </div>
        </div>

        {/* Chain Filter */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-gray-500">Filter:</span>
          <button
            onClick={() => setFilterChain(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              filterChain === null
                ? "bg-white/10 text-white border border-white/20"
                : "bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:border-gray-600"
            }`}
          >
            All Chains ({tasks.length})
          </button>
          {CHAINS.map((chain) => {
            const count = tasks.filter((t) => t.chainId === chain.id).length;
            return (
              <button
                key={chain.id}
                onClick={() => setFilterChain(chain.id === filterChain ? null : chain.id)}
                className={`transition ${
                  filterChain === chain.id
                    ? "ring-1 ring-white/30 rounded-full"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <ChainBadge chainId={chain.id} />
                <span className="ml-1 text-xs text-gray-500">({count})</span>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🤷</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No tasks {filterChain ? "on this chain" : "yet"}
            </h2>
            <p className="text-gray-400">
              {filterChain ? "Try another chain or clear the filter." : "Tasks will appear here when AI agents post jobs."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task, i) => (
              <TaskCard
                key={`${task.chainId}-${task.id?.toString() || i}`}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
