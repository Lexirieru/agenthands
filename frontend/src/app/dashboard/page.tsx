'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useReadContracts, useAccount, useConnect } from 'wagmi';
import { Briefcase, CheckCircle, Clock, Zap, Bot, HardHat, Loader2, Wallet } from 'lucide-react';
import gsap from 'gsap';
import { useTaskCount } from '@/hooks/useAgentHands';
import { AGENTHANDS_ADDRESS } from '@/config';
import AgentHandsABI from '@/abi/AgentHands.json';
import TaskCard from '@/components/TaskCard';
import type { TaskData, ContractResult } from '@/types/task';

type Tab = 'agent' | 'worker';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [tab, setTab] = useState<Tab>('worker');
  const statsRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const { data: taskCount } = useTaskCount();
  const count = taskCount ? Number(taskCount) : 0;

  const taskCalls = Array.from({ length: count }, (_, i) => ({
    address: AGENTHANDS_ADDRESS,
    abi: AgentHandsABI,
    functionName: 'getTask',
    args: [BigInt(i + 1)],
  })) as never[];

  const { data: tasksData, isLoading } = useReadContracts({
    contracts: taskCalls,
    query: { enabled: count > 0 },
  });

  const allTasks: TaskData[] =
    (tasksData as ContractResult[] | undefined)
      ?.filter((r) => r.status === 'success')
      .map((r) => r.result) || [];

  const myAgentTasks = allTasks.filter(
    (t) => t.agent?.toLowerCase() === address?.toLowerCase()
  );
  const myWorkerTasks = allTasks.filter(
    (t) => t.worker?.toLowerCase() === address?.toLowerCase()
  );

  const activeTasks = tab === 'agent' ? myAgentTasks : myWorkerTasks;

  const completedCount = myAgentTasks.filter((t) => Number(t.status) === 3).length +
    myWorkerTasks.filter((t) => Number(t.status) === 3).length;
  const activeCount = myAgentTasks.filter((t) => Number(t.status) < 3).length +
    myWorkerTasks.filter((t) => Number(t.status) < 3 && Number(t.status) > 0).length;

  useEffect(() => {
    if (!isLoading && statsRef.current) {
      const ctx = gsap.context(() => {
        gsap.from('.stat-card', {
          opacity: 0, y: 20, duration: 0.5, stagger: 0.1, ease: 'power2.out',
        });
      }, statsRef);
      return () => ctx.revert();
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading && gridRef.current) {
      const ctx = gsap.context(() => {
        gsap.from('.dash-card', {
          opacity: 0, y: 25, duration: 0.4, stagger: 0.06, ease: 'power2.out',
        });
      }, gridRef);
      return () => ctx.revert();
    }
  }, [isLoading, tab]);

  const handleConnect = () => {
    const connector = connectors.find(c => c.id === 'injected') || connectors[0];
    if (connector) connect({ connector });
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-7.5rem)] px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--card-solid)] border border-[var(--border)] flex items-center justify-center mb-4">
          <Wallet size={32} className="text-[#8B4513]" />
        </div>
        <h1 className="text-lg font-semibold text-[#5C2D0A] mb-2">Dashboard</h1>
        <p className="text-sm text-[#8B4513] mb-6">Connect wallet to view your tasks</p>
        <button
          onClick={handleConnect}
          className="flex items-center gap-2 px-8 py-3 bg-[#5C2D0A] text-white font-semibold rounded-xl text-sm active:scale-[0.98] transition-transform min-h-[48px]"
        >
          <Wallet size={16} />
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-7.5rem)] px-4 py-6 md:py-8 md:px-6 lg:px-8 overflow-y-auto mx-auto w-full max-w-7xl">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold text-[#5C2D0A] font-heading">Dashboard</h1>
          <p className="text-[#8B4513] font-mono text-xs mt-0.5">
            {address?.slice(0, 8)}...{address?.slice(-6)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="stat-card bg-[var(--card-solid)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#D4700A]/20 flex items-center justify-center">
              <Briefcase size={18} className="text-[#D4700A]" />
            </div>
            <div>
              <p className="text-[10px] text-[#8B4513] font-label">Posted</p>
              <p className="text-lg font-bold text-[#5C2D0A]">{myAgentTasks.length}</p>
            </div>
          </div>
        </div>
        <div className="stat-card bg-[var(--card-solid)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-900/15 flex items-center justify-center">
              <Clock size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] text-[#8B4513] font-label">Accepted</p>
              <p className="text-lg font-bold text-[#5C2D0A]">{myWorkerTasks.length}</p>
            </div>
          </div>
        </div>
        <div className="stat-card bg-[var(--card-solid)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-green-900/15 flex items-center justify-center">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-[10px] text-[#8B4513] font-label">Completed</p>
              <p className="text-lg font-bold text-[#5C2D0A]">{completedCount}</p>
            </div>
          </div>
        </div>
        <div className="stat-card bg-[var(--card-solid)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[var(--card)] flex items-center justify-center">
              <Zap size={18} className="text-[#D4700A]" />
            </div>
            <div>
              <p className="text-[10px] text-[#8B4513] font-label">Active</p>
              <p className="text-lg font-bold text-[#5C2D0A]">{activeCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[var(--card)] p-1 rounded-xl">
        {(['worker'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium font-label transition-colors min-h-[44px] ${
              tab === t ? 'bg-[#5C2D0A] text-white' : 'text-[#8B4513]'
            }`}
          >
              <><HardHat size={14} className="inline mr-1" />Worker ({myWorkerTasks.length})</>
          </button>
        ))}
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 animate-pulse h-32" />
          ))}
        </div>
      ) : activeTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-3 flex justify-center">
            {tab === 'agent' ? <Bot size={36} className="text-[#D4700A]" /> : <HardHat size={36} className="text-[#D4700A]" />}
          </div>
          <p className="text-sm text-[#5C2D0A] font-medium">
            {tab === 'agent' ? "No tasks posted yet" : "No tasks accepted yet"}
          </p>
          <Link
            href={tab === 'agent' ? '/tasks/new' : '/tasks'}
            className="inline-block mt-4 px-6 py-2.5 bg-[#5C2D0A] text-white font-semibold rounded-xl transition text-sm min-h-[44px]"
          >
            {tab === 'agent' ? 'Post Your First Task' : 'Browse Tasks'}
          </Link>
        </div>
      ) : (
        <div ref={gridRef} className="space-y-3 md:grid md:grid-cols-2 lg:md:grid-cols-3 md:gap-4 md:space-y-0">
          {activeTasks.map((task, i) => (
            <div key={i} className="dash-card">
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
