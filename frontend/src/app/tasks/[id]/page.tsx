'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { baseSepolia, celoAlfajores } from 'viem/chains';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppKitAccount } from '@reown/appkit/react';
import { ArrowLeft, Clock, DollarSign, MapPin, User, Loader2, CheckCircle, AlertTriangle, Lock, Hand, Camera, Star, HardHat } from 'lucide-react';
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
  0: 'bg-green-900/10 text-green-800',
  1: 'bg-blue-900/10 text-blue-800',
  2: 'bg-yellow-900/10 text-yellow-800',
  3: 'bg-green-900/15 text-green-900',
  4: 'bg-red-900/10 text-red-800',
  5: 'bg-gray-900/10 text-gray-600',
  6: 'bg-gray-900/10 text-gray-600',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#5C2D0A]/30 backdrop-blur-sm">
      <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl px-8 py-6 flex flex-col items-center gap-4 shadow-xl max-w-sm mx-4">
        <Loader2 size={32} className="text-[#D4700A] animate-spin" />
        <p className="text-[#5C2D0A] font-medium text-center">{message}</p>
        <p className="text-xs text-[#8B4513]">Waiting for on-chain confirmation...</p>
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
    queryClient.invalidateQueries(); // also refresh USDC balance in Header
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
    if (acceptSuccess) { toast('success', 'Task accepted!'); invalidateTask(); }
  }, [acceptSuccess, invalidateTask]);
  useEffect(() => {
    if (submitSuccess) { toast('success', 'Proof submitted!'); invalidateTask(); }
  }, [submitSuccess, invalidateTask]);
  useEffect(() => {
    if (approveSuccess) { toast('success', 'Payment released!'); invalidateTask(); }
  }, [approveSuccess, invalidateTask]);
  useEffect(() => {
    if (disputeSuccess) { toast('success', 'Task disputed'); invalidateTask(); }
  }, [disputeSuccess, invalidateTask]);
  useEffect(() => {
    if (cancelSuccess) { toast('success', 'Task cancelled'); invalidateTask(); }
  }, [cancelSuccess, invalidateTask]);
  useEffect(() => {
    if (rateWorkerSuccess) { toast('success', 'Worker rated!'); invalidateTask(); }
  }, [rateWorkerSuccess, invalidateTask]);
  useEffect(() => {
    if (rateAgentSuccess) { toast('success', 'Agent rated!'); invalidateTask(); }
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
          <div className="h-8 bg-[var(--border)] rounded w-1/3" />
          <div className="h-4 bg-[var(--border)] rounded w-2/3" />
          <div className="h-40 bg-[var(--border)] rounded" />
        </div>
      </div>
    );
  }

  if (!taskData) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 text-center text-[#8B4513]">
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
        <Link href="/tasks" className="inline-flex items-center gap-2 text-[#8B4513] hover:text-[#5C2D0A] mb-6 text-sm">
          <ArrowLeft size={16} />
          Back to tasks
        </Link>

        {/* Header */}
        <div className="detail-section bg-[var(--card-solid)] border border-[var(--border)] rounded-xl p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs sm:text-sm font-medium font-label px-3 py-1 rounded-full whitespace-nowrap ${statusColor}`}>
                  {statusInfo.label}
                </span>
                <span className="text-sm text-[#8B4513] font-label">Task #{id}</span>
              </div>
              <h1 className="text-xl sm:text-3xl tracking-tight text-[#5C2D0A] font-bold">{t.title}</h1>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://cdn.morpho.org/assets/logos/usdc.svg" alt="USDC" className="h-6 w-6" />
                <span className="text-2xl sm:text-3xl font-bold text-[#D4700A]">${rewardFormatted}</span>
              </div>
              <div className="text-sm text-[#8B4513] font-label">USDC</div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className="text-[#5C2D0A] whitespace-pre-wrap">{t.description}</p>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-[var(--card)] rounded-xl border border-[var(--border)]">
              <div className="text-sm text-[#8B4513] mb-1 flex items-center gap-1 font-label">
                <MapPin size={14} /> Location
              </div>
              <div className="text-[#5C2D0A] font-medium">{t.location}</div>
            </div>
            <div className="p-4 bg-[var(--card)] rounded-xl border border-[var(--border)]">
              <div className="text-sm text-[#8B4513] mb-1 flex items-center gap-1 font-label">
                <User size={14} /> Agent
              </div>
              <div className="text-[#5C2D0A] font-mono text-sm mb-1">
                {truncateAddress(t.agent || '')}
              </div>
              {t.agent && <AgentBadge agentAddress={t.agent} />}
            </div>
            <div className="p-4 bg-[var(--card)] rounded-xl border border-[var(--border)]">
              <div className="text-sm text-[#8B4513] mb-1 flex items-center gap-1 font-label">
                <Clock size={14} /> Accept Before
              </div>
              <div className="text-[#5C2D0A]">{deadline.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-[var(--card)] rounded-xl border border-[var(--border)]">
              <div className="text-sm text-[#8B4513] mb-1 flex items-center gap-1 font-label">
                <DollarSign size={14} /> Complete Before
              </div>
              <div className="text-[#5C2D0A]">{completionDeadline.toLocaleString()}</div>
            </div>
          </div>

          {/* Worker info */}
          {t.worker && t.worker !== '0x0000000000000000000000000000000000000000' && (
            <div className="p-4 bg-blue-900/10 rounded-xl border border-blue-400/30 mb-4">
              <div className="text-sm text-blue-800 mb-1 font-label flex items-center gap-1"><HardHat size={14} /> Worker</div>
              <div className="text-[#5C2D0A] font-mono text-sm">{t.worker}</div>
            </div>
          )}

          {/* Proof */}
          {t.proofCID && (
            <div className="p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] mb-4">
              <div className="text-sm text-[#D4700A] mb-1 font-label flex items-center gap-1"><Camera size={14} /> Proof (IPFS)</div>
              <a
                href={`https://gateway.pinata.cloud/ipfs/${t.proofCID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5C2D0A] hover:text-[#D4700A] font-mono text-sm break-all"
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
            <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-xl p-6 space-y-4">
              <SelfVerify onVerified={() => setSelfVerified(true)} />
              <button
                onClick={() => {
                  acceptWrite({ ...contractCall, functionName: 'acceptTask', args: [taskId] });
                  toast('info', 'Confirm transaction in wallet...');
                }}
                disabled={accepting || acceptConfirming || !selfVerified}
                className="w-full py-3 bg-[#5C2D0A] hover:bg-[#6B3A1F] disabled:bg-[#8B4513] text-white font-semibold rounded-lg transition text-sm flex items-center justify-center gap-2"
              >
                {accepting || acceptConfirming ? (
                  <><Loader2 size={16} className="animate-spin" /> {accepting ? 'Confirm in wallet...' : 'Confirming on-chain...'}</>
                ) : !selfVerified ? (
                  <><Lock size={16} /> Verify identity to accept</>
                ) : (
                  <><Hand size={16} /> Accept This Task</>
                )}
              </button>
            </div>
          )}

          {/* Submit proof */}
          {status === 1 && isWorker && (
            <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-[#5C2D0A]">Submit Proof</h2>
              <ProofUpload onCIDReady={(cid) => setProofCID(cid)} />
              {!proofCID && (
                <>
                  <div className="text-xs text-[#8B4513] font-label">Or paste CID manually:</div>
                  <input
                    type="text"
                    value={proofCID}
                    onChange={(e) => setProofCID(e.target.value)}
                    placeholder="IPFS CID (e.g. QmXyz...)"
                    className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[#5C2D0A] placeholder-[#8B4513] focus:outline-none focus:border-[#D4700A] text-sm"
                  />
                </>
              )}
              <button
                onClick={() => {
                  submitWrite({ ...contractCall, functionName: 'submitProof', args: [taskId, proofCID] });
                  toast('info', 'Submitting proof on-chain...');
                }}
                disabled={submitting || submitConfirming || !proofCID}
                className="w-full py-3 bg-[#D4700A] hover:bg-[#D4700A] disabled:bg-[#8B4513] text-white font-semibold rounded-lg transition text-sm flex items-center justify-center gap-2"
              >
                {submitting || submitConfirming ? (
                  <><Loader2 size={16} className="animate-spin" /> {submitting ? 'Confirm in wallet...' : 'Confirming...'}</>
                ) : (
                  <><Camera size={16} /> Submit Proof On-Chain</>
                )}
              </button>
            </div>
          )}

          {/* Approve / Dispute */}
          {status === 2 && isAgent && (
            <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-[#5C2D0A] mb-4">Review Submission</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    approveWrite({ ...contractCall, functionName: 'approveTask', args: [taskId] });
                    toast('info', 'Approving task...');
                  }}
                  disabled={approvingTask || approveConfirming}
                  className="py-3 bg-green-600 hover:bg-green-700 disabled:bg-[#8B4513] text-white font-semibold rounded-lg transition text-sm flex items-center justify-center gap-2"
                >
                  {approvingTask || approveConfirming ? (
                    <><Loader2 size={16} className="animate-spin" /> Approving...</>
                  ) : (
                    <><CheckCircle size={16} /> Approve & Pay</>
                  )}
                </button>
                <button
                  onClick={() => {
                    disputeWrite({ ...contractCall, functionName: 'disputeTask', args: [taskId] });
                    toast('info', 'Disputing task...');
                  }}
                  disabled={disputing || disputeConfirming}
                  className="py-3 bg-red-500 hover:bg-red-600 disabled:bg-[#8B4513] text-white font-semibold rounded-lg transition text-sm flex items-center justify-center gap-2"
                >
                  {disputing || disputeConfirming ? (
                    <><Loader2 size={16} className="animate-spin" /> Disputing...</>
                  ) : (
                    <><AlertTriangle size={16} /> Dispute</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Cancel */}
          {status === 0 && isAgent && (
            <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-xl p-6">
              <button
                onClick={() => {
                  cancelWrite({ ...contractCall, functionName: 'cancelTask', args: [taskId] });
                  toast('info', 'Cancelling task...');
                }}
                disabled={cancelling || cancelConfirming}
                className="w-full py-3 bg-[var(--card)] hover:bg-[var(--border)] text-[#5C2D0A] font-semibold rounded-lg transition text-sm flex items-center justify-center gap-2"
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
            <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[#5C2D0A] mb-3 flex items-center gap-1"><Star size={14} /> Rate</h3>
              <div className="flex items-center gap-2 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`transition ${star <= rating ? 'text-[#D4700A]' : 'text-[var(--border)]'}`}
                  >
                    <Star size={24} fill={star <= rating ? 'currentColor' : 'none'} />
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
                  className="w-full py-2 bg-[var(--card)] text-[#D4700A] hover:bg-[var(--border)] rounded-lg transition text-sm font-medium flex items-center justify-center gap-2"
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
                  className="w-full py-2 bg-[var(--card)] text-[#D4700A] hover:bg-[var(--border)] rounded-lg transition text-sm font-medium flex items-center justify-center gap-2"
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
