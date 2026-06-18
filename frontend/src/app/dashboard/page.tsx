'use client';
/** @module DashboardPage — Celo wallet dashboard showing balance and task history. */

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { Briefcase, CheckCircle, Clock, Zap, HardHat, ExternalLink } from 'lucide-react';
import gsap from 'gsap';
import TaskCard from '@/components/TaskCard';
import ConnectPrompt from '@/components/ConnectPrompt';
import DollarsCard from '@/components/DollarsCard';
import SelfVerify from '@/components/SelfVerify';
import { useAllTasks } from '@/hooks/useTasks';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useIsMiniPay } from '@/hooks/useIsMiniPay';
import { EXPLORER_URL } from '@/config';

/**
 * Tab selector for the Celo worker's personal task history.
 * `'active'` shows tasks in Open / Accepted / Submitted / Disputed status;
 * `'done'` shows Completed, Cancelled, and Expired tasks.
 */
type JobTab = 'active' | 'done';

/**
 * User dashboard — wallet balance, identity verification, and personal task history.
 *
 * Shows a DollarsCard with USDC + (desktop-only) CELO balance, a Self Protocol
 * ZK-identity verification widget, and a tabbed Active / Done task list filtered
 * to the connected Celo address. GSAP animates stat cards and the task grid on
 * load and whenever the active tab changes.
 *
 * CELO is intentionally excluded from the Dollars total on MiniPay / mobile
 * because it is volatile and not part of MiniPay's stablecoin-first UX.
 *
 * @since 1.0.0
 * @see DollarsCard — USDC + USDT + USDm + optional CELO balance card for Celo wallet
 */
export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const isMobile = useIsMobile();
  const isMiniPay = useIsMiniPay();
  // CELO is volatile and not part of MiniPay's stablecoin-first surface,
  // so we only fold it into the Dollars total on desktop browsers.
  const includeCelo = !isMobile && !isMiniPay;
  const [jobTab, setJobTab] = useState<JobTab>('active');
  const statsRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const { data: allTasks = [], isLoading } = useAllTasks();

  const { myAgentTasks, myWorkerTasks } = useMemo(() => {
    const addr = address?.toLowerCase();
    return {
      myAgentTasks: allTasks.filter((t) => t.agent?.toLowerCase() === addr),
      myWorkerTasks: allTasks.filter((t) => t.worker?.toLowerCase() === addr),
    };
  }, [allTasks, address]);

  // "Active" worker tasks = currently being worked on (Accepted=1) or
  //   awaiting agent review (Submitted=2). "Done" = Completed=3 only —
  //   anything settled with the worker actually paid out.
  const activeWorkerTasks = useMemo(
    () => myWorkerTasks.filter((t) => {
      const s = Number(t.status);
      return s === 1 || s === 2;
    }),
    [myWorkerTasks]
  );
  const doneWorkerTasks = useMemo(
    () => myWorkerTasks.filter((t) => Number(t.status) === 3),
    [myWorkerTasks]
  );
  const visibleTasks = jobTab === 'active' ? activeWorkerTasks : doneWorkerTasks;

  // completedCount: tasks in status=3 (Completed) where the user is either the agent or worker.
  // activeCount:    agent tasks with status < 3 (Open/Accepted/Submitted) plus
  //                 worker tasks with 0 < status < 3 (Accepted/Submitted — excludes Open since the
  //                 user hasn't been assigned yet, and excludes Completed/Disputed/Cancelled).
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
  }, [isLoading, jobTab]);

  if (!isConnected) {
    return (
      <div className="min-h-[calc(100dvh-7.5rem)] px-4 py-12 mx-auto w-full max-w-md">
        <ConnectPrompt title="Dashboard" subtitle="Connect wallet to view your tasks" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-7.5rem)] px-4 py-6 md:py-8 md:px-6 lg:px-8 overflow-y-auto mx-auto w-full max-w-7xl">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-4xl font-bold text-[#5C2D0A] font-heading">Dashboard</h1>
          {address && (
            <a
              href={`${EXPLORER_URL}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#8B4513] hover:text-[#D4700A] font-mono text-xs mt-0.5 transition-colors"
              title="View on Celoscan"
            >
              {address.slice(0, 8)}...{address.slice(-6)}
              <ExternalLink size={11} className="opacity-70" />
            </a>
          )}
        </div>
      </div>

      {/* Dollars total + per-token breakdown */}
      <div className="mb-6 md:mb-8">
        <DollarsCard
          address={address as `0x${string}` | undefined}
          includeCelo={includeCelo}
        />
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

      {/* Identity verification (moved here from /profile) */}
      <div className="mb-6 md:mb-8">
        <SelfVerify onVerified={() => {}} />
      </div>

      {/* Job tabs — Active (Accepted/Submitted) vs Done (Completed). The
          single dark indicator pill slides between the two tabs in sync
          with the click, same animation pattern as ProofUpload's tabs. */}
      <div className="relative flex p-1 mb-4 bg-[var(--card)] rounded-xl border border-[var(--border)]">
        <span
          aria-hidden
          className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] bg-[#5C2D0A] rounded-lg transition-transform duration-300 ease-out will-change-transform"
          style={{ transform: jobTab === 'done' ? 'translateX(100%)' : 'translateX(0)' }}
        />
        <button
          type="button"
          onClick={() => setJobTab('active')}
          className={`flex-1 relative z-10 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors duration-300 min-h-[44px] ${
            jobTab === 'active' ? 'text-white' : 'text-[#8B4513] hover:text-[#5C2D0A]'
          }`}
        >
          <HardHat size={14} /> Active ({activeWorkerTasks.length})
        </button>
        <button
          type="button"
          onClick={() => setJobTab('done')}
          className={`flex-1 relative z-10 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors duration-300 min-h-[44px] ${
            jobTab === 'done' ? 'text-white' : 'text-[#8B4513] hover:text-[#5C2D0A]'
          }`}
        >
          <CheckCircle size={14} /> Done ({doneWorkerTasks.length})
        </button>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 animate-pulse h-32" />
          ))}
        </div>
      ) : visibleTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-3 flex justify-center">
            {jobTab === 'active' ? (
              <HardHat size={36} className="text-[#D4700A]" />
            ) : (
              <CheckCircle size={36} className="text-[#D4700A]" />
            )}
          </div>
          <p className="text-sm text-[#5C2D0A] font-medium">
            {jobTab === 'active' ? 'No active jobs right now' : 'No completed jobs yet'}
          </p>
          {jobTab === 'active' && (
            <Link
              href="/tasks"
              className="inline-block mt-4 px-6 py-2.5 bg-[#5C2D0A] text-white font-semibold rounded-xl transition text-sm min-h-[44px]"
            >
              Browse Tasks
            </Link>
          )}
        </div>
      ) : (
        <div ref={gridRef} className="space-y-3 md:grid md:grid-cols-2 lg:md:grid-cols-3 md:gap-4 md:space-y-0">
          {visibleTasks.map((task, i) => (
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
                paymentToken={task.paymentToken}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
