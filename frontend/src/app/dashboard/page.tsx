"use client";

import { useState } from "react";
import Link from "next/link";
import { useReadContracts } from "wagmi";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { useTaskCount, useUSDCBalance } from "@/hooks/useAgentHands";
import { AGENTHANDS_ADDRESS } from "@/config";
import AgentHandsABI from "@/abi/AgentHands.json";
import TaskCard from "@/components/TaskCard";
import Navbar from "@/components/Navbar";
import type { TaskData, ContractResult } from "@/types/task";

type Tab = "agent" | "worker";

export default function DashboardPage() {
  const { address, isConnected } = useAppKitAccount();
  const { caipNetwork } = useAppKitNetwork();
  const chainId = caipNetwork?.id ? Number(String(caipNetwork.id).split(":")[1] || caipNetwork.id) : 0;
  const [tab, setTab] = useState<Tab>("agent");

  const { data: taskCount } = useTaskCount();
  const count = taskCount ? Number(taskCount) : 0;

  const { data: usdcBalance } = useUSDCBalance(
    address as `0x${string}` | undefined,
    chainId
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskCalls = Array.from({ length: count }, (_, i) => ({
    address: AGENTHANDS_ADDRESS,
    abi: AgentHandsABI,
    functionName: "getTask",
    args: [BigInt(i + 1)],
  })) as never[];

  const { data: tasksData, isLoading } = useReadContracts({
    contracts: taskCalls,
    query: { enabled: count > 0 },
  });

  const allTasks: TaskData[] =
    (tasksData as ContractResult[] | undefined)
      ?.filter((r) => r.status === "success")
      .map((r) => r.result) || [];

  const myAgentTasks = allTasks.filter(
    (t) => t.agent?.toLowerCase() === address?.toLowerCase()
  );
  const myWorkerTasks = allTasks.filter(
    (t) => t.worker?.toLowerCase() === address?.toLowerCase()
  );

  const activeTasks = tab === "agent" ? myAgentTasks : myWorkerTasks;

  const balanceFormatted = usdcBalance
    ? (Number(usdcBalance) / 1e6).toFixed(2)
    : "0.00";

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <Navbar />
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-gray-400 mb-6">Connect your wallet to view your dashboard</p>
          <appkit-button />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 mt-1 font-mono text-sm">
              {address?.slice(0, 8)}...{address?.slice(-6)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">USDC Balance</div>
            <div className="text-2xl font-bold text-emerald-400">${balanceFormatted}</div>
            <div className="text-xs text-gray-500">{caipNetwork?.name}</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-white">{myAgentTasks.length}</div>
            <div className="text-sm text-gray-500">Tasks Posted</div>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-white">{myWorkerTasks.length}</div>
            <div className="text-sm text-gray-500">Tasks Accepted</div>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {myAgentTasks.filter((t) => Number(t.status) === 3).length +
                myWorkerTasks.filter((t) => Number(t.status) === 3).length}
            </div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {myAgentTasks.filter((t) => Number(t.status) < 3).length +
                myWorkerTasks.filter((t) => Number(t.status) < 3 && Number(t.status) > 0).length}
            </div>
            <div className="text-sm text-gray-500">Active</div>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-gray-800/50 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("agent")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === "agent" ? "bg-emerald-500 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            🤖 As Agent ({myAgentTasks.length})
          </button>
          <button
            onClick={() => setTab("worker")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === "worker" ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            👷 As Worker ({myWorkerTasks.length})
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
          </div>
        ) : activeTasks.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">{tab === "agent" ? "🤖" : "👷"}</div>
            <p className="text-gray-400">
              {tab === "agent"
                ? "You haven't posted any tasks yet"
                : "You haven't accepted any tasks yet"}
            </p>
            {tab === "agent" && (
              <Link
                href="/tasks/new"
                className="inline-block mt-4 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition text-sm"
              >
                Post Your First Task
              </Link>
            )}
            {tab === "worker" && (
              <Link
                href="/tasks"
                className="inline-block mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition text-sm"
              >
                Browse Available Tasks
              </Link>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTasks.map((task, i) => (
              <TaskCard
                key={i}
                id={task.id || BigInt(i + 1)}
                title={task.title}
                description={task.description}
                location={task.location}
                reward={task.reward}
                deadline={task.deadline}
                status={Number(task.status)}
                agent={task.agent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
