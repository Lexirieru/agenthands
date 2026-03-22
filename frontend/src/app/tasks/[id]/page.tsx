'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { baseSepolia, celoAlfajores } from 'viem/chains';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppKitAccount } from '@reown/appkit/react';
import { ArrowLeft, Clock, DollarSign, MapPin, User, Loader2 } from 'lucide-react';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CHAIN_CLIENTS: Record<number, any> = {
  84532: createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') }),
  11142220: createPublicClient({ chain: { ...celoAlfajores, id: 11142220 as number, name: 'Celo Sepolia' }, transport: http('https://forno.celo-sepolia.celo-testnet.org') }),
};

const STATUS_COLORS: Record<number, string> = {
  0: 'bg-green-100 text-green-700',
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-yellow-100 text-yellow-700',
  3: 'bg-green-100 text-green-800',
  4: 'bg-red-100 text-red-700',
  5: 'bg-gray-100 text-gray-500',
  6: 'bg-gray-100 text-gray-500',
};

async function fetchTaskFromChain(chainId: number, taskId: bigint): Promise<TaskData | null> {
  try {
    const client = CHAIN_CLIENTS[chainId] || CHAIN_CLIENTS[84532];
    const result = await client.readContract({
      address: AGENTHANDS_ADDRESS,
      abi: AgentHandsABI,
      functionName: 'getTask',
      args: [taskId],
    });
    return result as unknown as TaskData;
  } catch {
    return null;
  }
}

/** Spinner overlay for pending tx */
function TxOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A0F08]/30 backdrop-blur-sm">
      <div className="bg-white border border-[#F5DEC8] rounded-2xl px-8 py-6 flex flex-col items-center gap-4 shadow-xl max-w-sm mx-4">
        <Loader2 size={32} className="text-[#FF8C42] animate-spin" />
        <p className="text-[#1A0F08] font-medium text-center">{message}</p>
        <p className="text-xs text-[#A07858]">Waiting for on-chain confirmation...</p>
      </div>
    </div>
  );
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const taskId = BigInt(id);
  const searchParams = useSearchParams();
  const chainParam = searchParams.get('chain');
  const chainId = chainParam ? Number(chainParam) : 84532;
  const queryClient = useQueryClient();
  const { address } = useAppKitAccount();
  const [proofCID, setProofCID] = useState('');
  const [rating, setRating] = useState(5);
  const [txMessage, setTxMessage] = useState<string | null>(null);
  const [selfVerified, setSelfVerified] = useState(
    typeof window !== 'undefined' && address
      ? !!localStorage.getItem(`self_verified_${address}`)
      : false
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // React Query for task data — auto refetch
  const queryKey = ['task', chainId, id];
  const { data: taskData, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchTaskFromChain(chainId, taskId),
    refetchInterval: 8000, // poll every 8s for updates
    staleTime: 4000,
  });

  const invalidateTask = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // Write hooks
  const { writeContract: acceptWrite, data: acceptTx, isPending: accepting } = useWriteContract();
  const { writeContract: submitWrite, data: submitTx, isPending: submitting } = useWriteContract();
  const { writeContract: approveWrite, data: approveTxHash, isPending: approvingTask } = useWriteContract();
  const { writeContract: disputeWrite, data: disputeTx, isPending: disputing } = useWriteContract();
  const { writeContract: cancelWrite, data: cancelTx, isPending: cancelling } = useWriteContract();
  const { writeContract: rateWorkerWrite, data: rateWorkerTx, isPending: ratingWorker } = useWriteContract();
  const { writeContract: rateAgentWrite, data: rateAgentTx, isPending: ratingAgent } = useWriteContract();

  // Wait for receipts
  const { isLoading: acceptConfirming, isSuccess: acceptSuccess } = useWaitForTransactionReceipt({ hash: acceptTx });
  const { isLoading: submitConfirming, isSuccess: submitSuccess } = useWaitForTransactionReceipt({ hash: submitTx });
  const { isLoading: approveConfirming, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: disputeConfirming, isSuccess: disputeSuccess } = useWaitForTransactionReceipt({ hash: disputeTx });
  const { isLoading: cancelConfirming, isSuccess: cancelSuccess } = useWaitForTransactionReceipt({ hash: cancelTx });
  const { isLoading: rateWorkerConfirming, isSuccess: rateWorkerSuccess } = useWaitForTransactionReceipt({ hash: rateWorkerTx });
  const { isLoading: rateAgentConfirming, isSuccess: rateAgentSuccess } = useWaitForTransactionReceipt({ hash: rateAgentTx });

  // Show overlay while confirming
  useEffect(() => {
    if (acceptConfirming) setTxMessage('Accepting task...');
    else if (submitConfirming) setTxMessage('Submitting proof...');
    else if (approveConfirming) setTxMessage('Approving & releasing payment...');
    else if (disputeConfirming) setTxMessage('Disputing task...');
    else if (cancelConfirming) setTxMessage('Cancelling task...');
    else if (rateWorkerConfirming) setTxMessage('Rating worker...');
    else if (rateAgentConfirming) setTxMessage('Rating agent...');
    else setTxMessage(null);
  }, [acceptConfirming, submitConfirming, approveConfirming, disputeConfirming, cancelConfirming, rateWorkerConfirming, rateAgentConfirming]);

  // On success → refetch + toast
  useEffect(() => {
    if (acceptSuccess) { toast('success', '✅ Task accepted!'); invalidateTask(); }
  }, [acceptSuccess, invalidateTask]);
  useEffect(() => {
    if (submitSuccess) { toast('success', '📸 Proof submitted!'); invalidateTask(); }
  }, [submitSuccess, invalidateTask]);
  useEffect(() => {
    if (approveSuccess) { toast('success', '💸 Payment released!'); invalidateTask(); }
  }, [approveSuccess, invalidateTask]);
  useEffect(() => {
    if (disputeSuccess) { toast('success', '⚠️ Task disputed'); invalidateTask(); }
  }, [disputeSuccess, invalidateTask]);
  useEffect(() => {
    if (cancelSuccess) { toast('success', 'Task cancelled'); invalidateTask(); }
  }, [cancelSuccess, invalidateTask]);
  useEffect(() => {
    if (rateWorkerSuccess) { toast('success', '⭐ Worker rated!'); invalidateTask(); }
  }, [rateWorkerSuccess, invalidateTask]);
  useEffect(() => {
    if (rateAgentSuccess) { toast('success', '⭐ Agent rated!'); invalidateTask(); }
  }, [rateAgentSuccess, invalidateTask]);

  // GSAP entrance animation
  useEffect(() => {
    if (!isLoading && taskData && containerRef.current) {
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
  }, [isLoading, taskData]);

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

  if (!taskData) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 text-center text-[#A07858]">
        <p className="text-lg">Task not found</p>
        <Link href="/tasks" className="text-[#D4700A] mt-4 inline-block">Back to tasks</Link>
      </div>
    );
  }

  const t = taskData;
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
    <>
      {txMessage && <TxOverlay message={txMessage} />}

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
              <div className="flex items-center gap-2 justify-end">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://cdn.morpho.org/assets/logos/usdc.svg" alt="USDC" className="h-6 w-6" />
                <span className="text-2xl sm:text-3xl font-bold text-[#D4700A]">${rewardFormatted}</span>
              </div>
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
            <ChainBadge chainId={chainId} size="md" />
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
                disabled={accepting || acceptConfirming || !selfVerified}
                className="w-full py-3 bg-[#1A0F08] hover:bg-[#2a1a0c] disabled:bg-[#A07858] text-white font-semibold rounded-lg transition text-sm flex items-center justify-center gap-2"
              >
                {accepting || acceptConfirming ? (
                  <><Loader2 size={16} className="animate-spin" /> {accepting ? 'Confirm in wallet...' : 'Confirming on-chain...'}</>
                ) : !selfVerified ? (
                  '🔒 Verify identity to accept'
                ) : (
                  '✋ Accept This Task'
                )}
              </button>
            </div>
          )}

          {/* Submit proof */}
          {status === 1 && isWorker && (
            <div className="bg-white border border-[#F5DEC8] rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-[#1A0F08]">Submit Proof</h2>
              <ProofUpload onCIDReady={(cid) => setProofCID(cid)} />
              {!proofCID && (
                <>
                  <div className="text-xs text-[#A07858] font-label">Or paste CID manually:</div>
                  <input
                    type="text"
                    value={proofCID}
                    onChange={(e) => setProofCID(e.target.value)}
                    placeholder="IPFS CID (e.g. QmXyz...)"
                    className="w-full px-4 py-3 bg-[#FFFAF5] border border-[#F5DEC8] rounded-lg text-[#1A0F08] placeholder-[#A07858] focus:outline-none focus:border-[#FF8C42] text-sm"
                  />
                </>
              )}
              <button
                onClick={() => {
                  submitWrite({ ...contractCall, functionName: 'submitProof', args: [taskId, proofCID] });
                  toast('info', 'Submitting proof on-chain...');
                }}
                disabled={submitting || submitConfirming || !proofCID}
                className="w-full py-3 bg-[#FF8C42] hover:bg-[#D4700A] disabled:bg-[#A07858] text-white font-semibold rounded-lg transition text-sm flex items-center justify-center gap-2"
              >
                {submitting || submitConfirming ? (
                  <><Loader2 size={16} className="animate-spin" /> {submitting ? 'Confirm in wallet...' : 'Confirming...'}</>
                ) : (
                  '📸 Submit Proof On-Chain'
                )}
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
                  disabled={approvingTask || approveConfirming}
                  className="py-3 bg-green-600 hover:bg-green-700 disabled:bg-[#A07858] text-white font-semibold rounded-lg transition text-sm flex items-center justify-center gap-2"
                >
                  {approvingTask || approveConfirming ? (
                    <><Loader2 size={16} className="animate-spin" /> Approving...</>
                  ) : (
                    '✅ Approve & Pay'
                  )}
                </button>
                <button
                  onClick={() => {
                    disputeWrite({ ...contractCall, functionName: 'disputeTask', args: [taskId] });
                    toast('info', 'Disputing task...');
                  }}
                  disabled={disputing || disputeConfirming}
                  className="py-3 bg-red-500 hover:bg-red-600 disabled:bg-[#A07858] text-white font-semibold rounded-lg transition text-sm flex items-center justify-center gap-2"
                >
                  {disputing || disputeConfirming ? (
                    <><Loader2 size={16} className="animate-spin" /> Disputing...</>
                  ) : (
                    '⚠️ Dispute'
                  )}
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
                disabled={cancelling || cancelConfirming}
                className="w-full py-3 bg-[#FFF2E8] hover:bg-[#F5DEC8] text-[#1A0F08] font-semibold rounded-lg transition text-sm flex items-center justify-center gap-2"
              >
                {cancelling || cancelConfirming ? (
                  <><Loader2 size={16} className="animate-spin" /> Cancelling...</>
                ) : (
                  'Cancel Task'
                )}
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
                  disabled={ratingWorker || rateWorkerConfirming}
                  className="w-full py-2 bg-[#FFF2E8] text-[#D4700A] hover:bg-[#F5DEC8] rounded-lg transition text-sm font-medium flex items-center justify-center gap-2"
                >
                  {ratingWorker || rateWorkerConfirming ? (
                    <><Loader2 size={16} className="animate-spin" /> Rating...</>
                  ) : (
                    'Rate Worker'
                  )}
                </button>
              )}
              {isWorker && (
                <button
                  onClick={() => {
                    rateAgentWrite({ ...contractCall, functionName: 'rateAgent', args: [taskId, rating] });
                    toast('info', 'Rating agent...');
                  }}
                  disabled={ratingAgent || rateAgentConfirming}
                  className="w-full py-2 bg-[#FFF2E8] text-[#D4700A] hover:bg-[#F5DEC8] rounded-lg transition text-sm font-medium flex items-center justify-center gap-2"
                >
                  {ratingAgent || rateAgentConfirming ? (
                    <><Loader2 size={16} className="animate-spin" /> Rating...</>
                  ) : (
                    'Rate Agent'
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
