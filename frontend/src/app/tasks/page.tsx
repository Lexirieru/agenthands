"use client";

import { useReadContracts } from "wagmi";
import { useTaskCount } from "@/hooks/useAgentHands";
import { AGENTHANDS_ADDRESS } from "@/config";
import AgentHandsABI from "@/abi/AgentHands.json";
import TaskCard from "@/components/TaskCard";
import Navbar from "@/components/Navbar";

export default function TasksPage() {
  const { data: taskCount, isLoading: countLoading } = useTaskCount();
  const count = taskCount ? Number(taskCount) : 0;

  // Build array of getTask calls
  const taskCalls = Array.from({ length: count }, (_, i) => ({
    address: AGENTHANDS_ADDRESS,
    abi: AgentHandsABI as any,
    functionName: "getTask",
    args: [BigInt(i + 1)],
  }));

  const { data: tasksData, isLoading: tasksLoading } = useReadContracts({
    contracts: taskCalls,
    query: { enabled: count > 0 },
  });

  const isLoading = countLoading || tasksLoading;

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
          <a
            href="/tasks/new"
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition text-sm"
          >
            + Post Task
          </a>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
          </div>
        ) : count === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🤷</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No tasks yet
            </h2>
            <p className="text-gray-400">
              Be the first to post a task for human workers!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasksData?.map((result: any, i: number) => {
              if (result.status !== "success") return null;
              const task = result.result;
              return (
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
