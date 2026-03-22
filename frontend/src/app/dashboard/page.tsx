'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useReadContracts } from 'wagmi';
import { useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { Briefcase, CheckCircle, Clock, Zap, Bot, HardHat } from 'lucide-react';
import gsap from 'gsap';
import { useTaskCount, useUSDCBalance } from '@/hooks/useAgentHands';
import { AGENTHANDS_ADDRESS } from '@/config';
import AgentHandsABI from '@/abi/AgentHands.json';
import TaskCard from '@/components/TaskCard';
import type { TaskData, ContractResult } from '@/types/task';

type Tab = 'agent' | 'worker';

export default function DashboardPage() {
  const { address, isConnected } = useAppKitAccount();
  const { caipNetwork } = useAppKitNetwork();
  const chainId = caipNetwork?.id ? Number(String(caipNetwork.id).split(':')[1] || caipNetwork.id) : 0;
  const [tab, setTab] = useState<Tab>('agent');
  const statsRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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

  const balanceFormatted = usdcBalance
    ? (Number(usdcBalance) / 1e6).toFixed(2)
    : '0.00';

  const completedCount = myAgentTasks.filter((t) => Number(t.status) === 3).length +
    myWorkerTasks.filter((t) => Number(t.status) === 3).length;
  const activeCount = myAgentTasks.filter((t) => Number(t.status) < 3).length +
    myWorkerTasks.filter((t) => Number(t.status) < 3 && Number(t.status) > 0).length;

  // GSAP: animate stats
  useEffect(() => {
    if (!isLoading && statsRef.current) {
      const ctx = gsap.context(() => {
        gsap.from('.stat-card', {
          opacity: 0,
          y: 20,
          duration: 0.5,
          stagger: 0.1,
          ease: 'power2.out',
        });
      }, statsRef);
      return () => ctx.revert();
    }
  }, [isLoading]);

  // GSAP: animate cards
  useEffect(() => {
    if (!isLoading && gridRef.current) {
      const ctx = gsap.context(() => {
        gsap.from('.dash-card', {
          opacity: 0,
          y: 25,
          duration: 0.4,
          stagger: 0.06,
          ease: 'power2.out',
        });
      }, gridRef);
      return () => ctx.revert();
    }
  }, [isLoading, tab]);

  if (!isConnected) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl sm:text-3xl tracking-tight text-[#5C2D0A] mb-4 font-bold">Dashboard</h1>
        <p className="text-[#5C2D0A] mb-6">Connect your wallet to view your dashboard.</p>
        <appkit-button />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl tracking-tight text-[#5C2D0A] font-bold">Dashboard</h1>
          <p className="text-[#8B4513] mt-1 font-mono text-sm">
            {address?.slice(0, 8)}...{address?.slice(-6)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-[#8B4513] font-label">USDC Balance</div>
          <div className="text-2xl font-bold text-[#D4700A]">${balanceFormatted}</div>
          <div className="text-xs text-[#8B4513]">{caipNetwork?.name}</div>
        </div>
      </div>

      {/* Stats */}
      <div ref={statsRef} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="stat-card bg-[var(--card-solid)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#D4700A]/20 flex items-center justify-center">
              <Briefcase size={20} className="text-[#D4700A]" />
            </div>
            <div>
              <p className="text-xs text-[#8B4513] font-label">Tasks Posted</p>
              <p className="text-lg font-bold text-[#5C2D0A]">{myAgentTasks.length}</p>
            </div>
          </div>
        </div>
        <div className="stat-card bg-[var(--card-solid)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900/15 flex items-center justify-center">
              <Clock size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-[#8B4513] font-label">Tasks Accepted</p>
              <p className="text-lg font-bold text-[#5C2D0A]">{myWorkerTasks.length}</p>
            </div>
          </div>
        </div>
        <div className="stat-card bg-[var(--card-solid)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-900/15 flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-[#8B4513] font-label">Completed</p>
              <p className="text-lg font-bold text-[#5C2D0A]">{completedCount}</p>
            </div>
          </div>
        </div>
        <div className="stat-card bg-[var(--card-solid)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--card)] flex items-center justify-center">
              <Zap size={20} className="text-[#D4700A]" />
            </div>
            <div>
              <p className="text-xs text-[#8B4513] font-label">Active</p>
              <p className="text-lg font-bold text-[#5C2D0A]">{activeCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[var(--card)] p-1 rounded-lg w-full sm:w-auto sm:inline-flex">
        {(['agent', 'worker'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium font-label transition-colors ${
              tab === t ? 'bg-[#5C2D0A] text-white' : 'text-[#8B4513] hover:text-[#5C2D0A]'
            }`}
          >
            {t === 'agent' ? <><Bot size={14} className="inline mr-1" />As Agent ({myAgentTasks.length})</> : <><HardHat size={14} className="inline mr-1" />As Worker ({myWorkerTasks.length})</>}
          </button>
        ))}
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 animate-pulse h-40" />
          ))}
        </div>
      ) : activeTasks.length === 0 ? (
        <div className="text-center py-16 text-[#8B4513]">
          <div className="mb-3 flex justify-center">{tab === 'agent' ? <Bot size={40} className="text-[#D4700A]" /> : <HardHat size={40} className="text-[#D4700A]" />}</div>
          <p className="text-[#5C2D0A]">
            {tab === 'agent'
              ? "You haven't posted any tasks yet"
              : "You haven't accepted any tasks yet"}
          </p>
          {tab === 'agent' && (
            <Link
              href="/tasks/new"
              className="inline-block mt-4 px-6 py-2.5 bg-[#5C2D0A] hover:bg-[#6B3A1F] text-white font-semibold rounded-lg transition text-sm"
            >
              Post Your First Task
            </Link>
          )}
          {tab === 'worker' && (
            <Link
              href="/tasks"
              className="inline-block mt-4 px-6 py-2.5 bg-[#5C2D0A] hover:bg-[#6B3A1F] text-white font-semibold rounded-lg transition text-sm"
            >
              Browse Available Tasks
            </Link>
          )}
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
