'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAppKitAccount } from '@reown/appkit/react';
import { ArrowLeft, Clock, DollarSign, MapPin, User } from 'lucide-react';
import Link from 'next/link';
import gsap from 'gsap';
import { AGENTHANDS_ADDRESS } from '@/config';
import AgentHandsABI from '@/abi/AgentHands.json';
import ProofUpload from '@/components/ProofUpload';
import SelfVerify from '@/components/SelfVerify';
import AgentBadge from '@/components/AgentBadge';
import ChainBadge from '@/components/ChainBadge';
import { getStatusDisplay, truncateAddress } from '@/lib/utils/format';
import { toast } from '@/components/Toast';
import type { TaskData } from '@/types/task';

const STATUS_COLORS: Record<number, string> = {
  0: 'bg-green-100 text-green-700',
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-yellow-100 text-yellow-700',
  3: 'bg-green-100 text-green-800',
  4: 'bg-red-100 text-red-700',
  5: 'bg-gray-100 text-gray-500',
  6: 'bg-gray-100 text-gray-500',
};

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const taskId = BigInt(id);
  const { address } = useAppKitAccount();
  const [proofCID, setProofCID] = useState('');
  const [rating, setRating] = useState(5);
  const [selfVerified, setSelfVerified] = useState(
    typeof window !== 'undefined' && address
      ? !!localStorage.getItem(`self_verified_${address}`)
      : false
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: task, isLoading, refetch } = useReadContract({
    address: AGENTHANDS_ADDRESS,
    abi: AgentHandsABI as typeof AgentHandsABI,
    functionName: 'getTask',
    args: [taskId],
  });

  const { writeContract: acceptWrite, data: acceptTx, isPending: accepting } = useWriteContract();
  const { writeContract: submitWrite, data: submitTx, isPending: submitting } = useWriteContract();
  const { writeContract: approveWrite, data: approveTxHash, isPending: approvingTask } = useWriteContract();
  const { writeContract: disputeWrite, isPending: disputing } = useWriteContract();
  const { writeContract: cancelWrite, data: cancelTx, isPending: cancelling } = useWriteContract();
  const { writeContract: rateWorkerWrite, isPending: ratingWorker } = useWriteContract();
  const { writeContract: rateAgentWrite, isPending: ratingAgent } = useWriteContract();

  const { isSuccess: acceptSuccess } = useWaitForTransactionReceipt({ hash: acceptTx });
  const { isSuccess: submitSuccess } = useWaitForTransactionReceipt({ hash: submitTx });
  const { isSuccess: approveTaskSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isSuccess: cancelSuccess } = useWaitForTransactionReceipt({ hash: cancelTx });

  if (acceptSuccess || submitSuccess || approveTaskSuccess || cancelSuccess) {
    refetch();
  }

  // GSAP entrance animation
  useEffect(() => {
    if (!isLoading && task && containerRef.current) {
      const ctx = gsap.context(() => {
        gsap.from('.detail-section', {
          opacity: 0,
          y: 25,
          duration: 0.5,
          stagger: 0.12,
          ease: 'power2.out',
        });
      }, containerRef);
      return () => ctx.revert();
    }
  }, [isLoading, task]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#F5DEC8] rounded w-1/3" />
          <div className="h-4 bg-[#F5DEC8] rounded w-2/3" />
          <div className="h-40 bg-[#F5DEC8] rounded" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 text-center text-[#A07858]">
        <p className="text-lg">Task not found</p>
        <Link href="/tasks" className="text-[#D4700A] mt-4 inline-block">Back to tasks</Link>
      </div>
    );
  }

  const t = task as unknown as TaskData;
  const status = Number(t.status);
  const statusInfo = getStatusDisplay(status);
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS[0];
  const rewardFormatted = (Number(t.reward) / 1e6).toFixed(2);
  const isAgent = address?.toLowerCase() === t.agent?.toLowerCase();
  const isWorker = address?.toLowerCase() === t.worker?.toLowerCase();
  const deadline = new Date(Number(t.deadline) * 1000);
  const completionDeadline = new Date(Number(t.completionDeadline) * 1000);

  const contractCall = {
    address: AGENTHANDS_ADDRESS,
    abi: AgentHandsABI as typeof AgentHandsABI,
  };

  return (
    <div ref={containerRef} className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Back */}
      <Link href="/tasks" className="inline-flex items-center gap-2 text-[#A07858] hover:text-[#1A0F08] mb-6 text-sm">
        <ArrowLeft size={16} />
        Back to tasks
      </Link>

      {/* Header */}
      <div className="detail-section bg-white border border-[#F5DEC8] rounded-xl p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs sm:text-sm font-medium font-label px-3 py-1 rounded-full whitespace-nowrap ${statusColor}`}>
                {statusInfo.label}
              </span>
              <span className="text-sm text-[#A07858] font-label">Task #{id}</span>
            </div>
            <h1 className="text-xl sm:text-3xl tracking-tight text-[#1A0F08] font-bold">{t.title}</h1>
          </div>
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-bold text-[#D4700A]">${rewardFormatted}</div>
            <div className="text-sm text-[#A07858] font-label">USDC</div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <p className="text-[#6B5040] whitespace-pre-wrap">{t.description}</p>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-[#FFFAF5] rounded-xl border border-[#F5DEC8]">
            <div className="text-sm text-[#A07858] mb-1 flex items-center gap-1 font-label">
              <MapPin size={14} /> Location
            </div>
            <div className="text-[#1A0F08] font-medium">{t.location}</div>
          </div>
          <div className="p-4 bg-[#FFFAF5] rounded-xl border border-[#F5DEC8]">
            <div className="text-sm text-[#A07858] mb-1 flex items-center gap-1 font-label">
              <User size={14} /> Agent
            </div>
            <div className="text-[#1A0F08] font-mono text-sm mb-1">
              {truncateAddress(t.agent || '')}
            </div>
            {t.agent && <AgentBadge agentAddress={t.agent} />}
          </div>
          <div className="p-4 bg-[#FFFAF5] rounded-xl border border-[#F5DEC8]">
            <div className="text-sm text-[#A07858] mb-1 flex items-center gap-1 font-label">
              <Clock size={14} /> Accept Before
            </div>
            <div className="text-[#1A0F08]">{deadline.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-[#FFFAF5] rounded-xl border border-[#F5DEC8]">
            <div className="text-sm text-[#A07858] mb-1 flex items-center gap-1 font-label">
              <DollarSign size={14} /> Complete Before
            </div>
            <div className="text-[#1A0F08]">{completionDeadline.toLocaleString()}</div>
          </div>
        </div>

        {/* Worker info */}
        {t.worker && t.worker !== '0x0000000000000000000000000000000000000000' && (
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 mb-4">
            <div className="text-sm text-blue-600 mb-1 font-label">👷 Worker</div>
            <div className="text-[#1A0F08] font-mono text-sm">{t.worker}</div>
          </div>
        )}

        {/* Proof */}
        {t.proofCID && (
          <div className="p-4 bg-[#FFF2E8] rounded-xl border border-[#F5DEC8] mb-4">
            <div className="text-sm text-[#D4700A] mb-1 font-label">📸 Proof (IPFS)</div>
            <a
              href={`https://gateway.pinata.cloud/ipfs/${t.proofCID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1A0F08] hover:text-[#D4700A] font-mono text-sm break-all"
            >
              {t.proofCID}
            </a>
          </div>
        )}

        {/* Chain badge */}
        <div className="flex items-center gap-2">
          <ChainBadge chainId={84532} size="md" />
        </div>
      </div>

      {/* Actions */}
      <div className="detail-section space-y-4">
        {/* Accept task */}
        {status === 0 && !isAgent && (
          <div className="bg-white border border-[#F5DEC8] rounded-xl p-6 space-y-4">
            <SelfVerify onVerified={() => setSelfVerified(true)} />
            <button
              onClick={() => {
                acceptWrite({ ...contractCall, functionName: 'acceptTask', args: [taskId] });
                toast('info', 'Confirm transaction in wallet...');
              }}
              disabled={accepting || !selfVerified}
              className="w-full py-3 bg-[#1A0F08] hover:bg-[#2a1a0c] disabled:bg-[#A07858] text-white font-semibold rounded-lg transition text-sm"
            >
              {!selfVerified
                ? '🔒 Verify identity to accept'
                : accepting
                  ? 'Accepting...'
                  : '✋ Accept This Task'}
            </button>
          </div>
        )}

        {/* Submit proof */}
        {status === 1 && isWorker && (
          <div className="bg-white border border-[#F5DEC8] rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#1A0F08]">Submit Proof</h2>
            <ProofUpload onCIDReady={(cid) => setProofCID(cid)} />
            <div className="text-xs text-[#A07858] font-label">Or paste CID manually:</div>
            <input
              type="text"
              value={proofCID}
              onChange={(e) => setProofCID(e.target.value)}
              placeholder="IPFS CID (e.g. QmXyz...)"
              className="w-full px-4 py-3 bg-[#FFFAF5] border border-[#F5DEC8] rounded-lg text-[#1A0F08] placeholder-[#A07858] focus:outline-none focus:border-[#FF8C42] text-sm"
            />
            <button
              onClick={() => {
                submitWrite({ ...contractCall, functionName: 'submitProof', args: [taskId, proofCID] });
                toast('info', 'Submitting proof on-chain...');
              }}
              disabled={submitting || !proofCID}
              className="w-full py-3 bg-[#FF8C42] hover:bg-[#D4700A] disabled:bg-[#A07858] text-white font-semibold rounded-lg transition text-sm"
            >
              {submitting ? 'Submitting...' : '📸 Submit Proof On-Chain'}
            </button>
          </div>
        )}

        {/* Approve / Dispute */}
        {status === 2 && isAgent && (
          <div className="bg-white border border-[#F5DEC8] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#1A0F08] mb-4">Review Submission</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  approveWrite({ ...contractCall, functionName: 'approveTask', args: [taskId] });
                  toast('info', 'Approving task...');
                }}
                disabled={approvingTask}
                className="py-3 bg-green-600 hover:bg-green-700 disabled:bg-[#A07858] text-white font-semibold rounded-lg transition text-sm"
              >
                {approvingTask ? 'Approving...' : '✅ Approve & Pay'}
              </button>
              <button
                onClick={() => {
                  disputeWrite({ ...contractCall, functionName: 'disputeTask', args: [taskId] });
                  toast('info', 'Disputing task...');
                }}
                disabled={disputing}
                className="py-3 bg-red-500 hover:bg-red-600 disabled:bg-[#A07858] text-white font-semibold rounded-lg transition text-sm"
              >
                {disputing ? 'Disputing...' : '⚠️ Dispute'}
              </button>
            </div>
          </div>
        )}

        {/* Cancel */}
        {status === 0 && isAgent && (
          <div className="bg-white border border-[#F5DEC8] rounded-xl p-6">
            <button
              onClick={() => {
                cancelWrite({ ...contractCall, functionName: 'cancelTask', args: [taskId] });
                toast('info', 'Cancelling task...');
              }}
              disabled={cancelling}
              className="w-full py-3 bg-[#FFF2E8] hover:bg-[#F5DEC8] text-[#1A0F08] font-semibold rounded-lg transition text-sm"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Task'}
            </button>
          </div>
        )}

        {/* Rate */}
        {status === 3 && (isAgent || isWorker) && (
          <div className="bg-white border border-[#F5DEC8] rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[#1A0F08] mb-3">⭐ Rate</h3>
            <div className="flex items-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-2xl transition ${star <= rating ? 'text-[#FF8C42]' : 'text-[#F5DEC8]'}`}
                >
                  ★
                </button>
              ))}
            </div>
            {isAgent && (
              <button
                onClick={() => {
                  rateWorkerWrite({ ...contractCall, functionName: 'rateWorker', args: [taskId, rating] });
                  toast('info', 'Rating worker...');
                }}
                disabled={ratingWorker}
                className="w-full py-2 bg-[#FFF2E8] text-[#D4700A] hover:bg-[#F5DEC8] rounded-lg transition text-sm font-medium"
              >
                {ratingWorker ? 'Rating...' : 'Rate Worker'}
              </button>
            )}
            {isWorker && (
              <button
                onClick={() => {
                  rateAgentWrite({ ...contractCall, functionName: 'rateAgent', args: [taskId, rating] });
                  toast('info', 'Rating agent...');
                }}
                disabled={ratingAgent}
                className="w-full py-2 bg-[#FFF2E8] text-[#D4700A] hover:bg-[#F5DEC8] rounded-lg transition text-sm font-medium"
              >
                {ratingAgent ? 'Rating...' : 'Rate Agent'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
