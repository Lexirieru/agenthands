'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useSwitchChain } from 'wagmi';
import { ArrowLeft, Clock, DollarSign, MapPin, User, Loader2, CheckCircle, AlertTriangle, Lock, Hand, Camera, Star, HardHat } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AGENTHANDS_ADDRESS, CHAIN } from '@/config';
import AgentHandsABI from '@/abi/AgentHands.json';
import ProofUpload from '@/components/ProofUpload';
import SelfVerify from '@/components/SelfVerify';
import { formatUSDC, getStatusDisplay, truncateAddress } from '@/lib/utils/format';
import { fetchSelfVerified } from '@/lib/utils/verification';
import { useCip64 } from '@/hooks/useCip64';
import { toast } from '@/components/Toast';
import { useTaskDetail, useInvalidateTasks } from '@/hooks/useTasks';

const STATUS_COLORS: Record<number, string> = {
  0: 'bg-green-900/10 text-green-800',
  1: 'bg-blue-900/10 text-blue-800',
  2: 'bg-yellow-900/10 text-yellow-800',
  3: 'bg-green-900/15 text-green-900',
  4: 'bg-red-900/10 text-red-800',
  5: 'bg-gray-900/10 text-gray-600',
  6: 'bg-gray-900/10 text-gray-600',
};

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
  const router = useRouter();
  const { address, chainId: currentChainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [proofCID, setProofCID] = useState('');
  const [rating, setRating] = useState(5);
  const [txMessage, setTxMessage] = useState<string | null>(null);
  const [selfVerified, setSelfVerified] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (!address) {
      setSelfVerified(false);
      return;
    }
    fetchSelfVerified(address).then((ok) => {
      if (!cancelled) setSelfVerified(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [address]);

  const { data: taskData, isLoading } = useTaskDetail(taskId);
  const { invalidateDetail, invalidateList, patchDetail } = useInvalidateTasks();
  const cip64 = useCip64();

  const ensureChain = useCallback(() => {
    if (currentChainId !== CHAIN.id) {
      switchChain({ chainId: CHAIN.id });
      toast('info', `Switching to ${CHAIN.name}...`);
      return false;
    }
    return true;
  }, [currentChainId, switchChain]);

  const invalidateTask = useCallback(() => {
    invalidateDetail(taskId);
    invalidateList();
  }, [invalidateDetail, invalidateList, taskId]);

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

  // On success -> patch the cache optimistically so the UI reflects the new
  // state immediately. The global event watcher (useTaskEventWatcher) and
  // the per-query polling reconcile the cache with chain state within a few
  // seconds, but calling invalidate here would refetch *now* — and on a
  // freshly mined block the RPC node often still serves stale data, which
  // would clobber the optimistic patch and make the UI flicker back.
  useEffect(() => {
    if (acceptSuccess && address) {
      toast('success', 'Task accepted!');
      patchDetail(taskId, { worker: address, status: 1 });
    }
  }, [acceptSuccess, address, taskId, patchDetail]);
  useEffect(() => {
    if (submitSuccess) {
      toast('success', 'Proof submitted!');
      patchDetail(taskId, { proofCID, status: 2 });
    }
  }, [submitSuccess, proofCID, taskId, patchDetail]);
  useEffect(() => {
    if (approveSuccess) {
      toast('success', 'Payment released!');
      patchDetail(taskId, { status: 3 });
    }
  }, [approveSuccess, taskId, patchDetail]);
  useEffect(() => {
    if (disputeSuccess) {
      toast('success', 'Task disputed');
      patchDetail(taskId, { status: 4 });
    }
  }, [disputeSuccess, taskId, patchDetail]);
  useEffect(() => {
    if (cancelSuccess) {
      toast('success', 'Task cancelled');
      patchDetail(taskId, { status: 5 });
    }
  }, [cancelSuccess, taskId, patchDetail]);
  useEffect(() => {
    if (rateWorkerSuccess) {
      toast('success', 'Worker rated!');
      invalidateTask();
      const t = setTimeout(() => router.push('/tasks'), 1200);
      return () => clearTimeout(t);
    }
  }, [rateWorkerSuccess, invalidateTask, router]);
  useEffect(() => {
    if (rateAgentSuccess) {
      toast('success', 'Agent rated!');
      invalidateTask();
      const t = setTimeout(() => router.push('/tasks'), 1200);
      return () => clearTimeout(t);
    }
  }, [rateAgentSuccess, invalidateTask, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-7.5rem)]">
        <Loader2 size={32} className="text-[#D4700A] animate-spin" />
      </div>
    );
  }

  if (!taskData) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-7.5rem)] px-4 text-center">
        <p className="text-lg text-[#8B4513]">Task not found</p>
        <Link href="/tasks" className="text-[#D4700A] mt-4 text-sm">Back to tasks</Link>
      </div>
    );
  }

  const t = taskData;
  const status = Number(t.status);
  const statusInfo = getStatusDisplay(status);
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS[0];
  const rewardFormatted = formatUSDC(t.reward);
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

      <div ref={containerRef} className="min-h-[calc(100dvh-7.5rem)] px-4 py-4 md:py-8 md:px-6 lg:px-8 overflow-y-auto mx-auto w-full max-w-4xl">
        {/* Back */}
        <Link href="/tasks" className="inline-flex items-center gap-2 text-[#8B4513] text-sm mb-4 min-h-[44px]">
          <ArrowLeft size={18} />
          Back
        </Link>

        {/* Header card */}
        <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl p-5 mb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium font-label px-3 py-1 rounded-full ${statusColor}`}>
                  {statusInfo.label}
                </span>
                <span className="text-xs text-[#8B4513] font-label">#{id}</span>
              </div>
              <h1 className="text-xl font-bold text-[#5C2D0A]">{t.title}</h1>
            </div>
          </div>

          {/* Reward */}
          <div className="flex items-center gap-2 p-3 bg-[#D4700A]/10 rounded-xl border border-[#D4700A]/20 mb-4">
            <img src="/usdclogo.png" alt="USDC" className="h-8 w-8" />
            <div>
              <span className="text-2xl font-bold text-[#D4700A]">${rewardFormatted}</span>
              <div className="text-xs text-[#8B4513] font-label">USDC</div>
            </div>
          </div>

          {/* Description */}
          <p className="text-[#5C2D0A] text-sm mb-4 whitespace-pre-wrap">{t.description}</p>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-[var(--card)] rounded-xl">
              <div className="text-xs text-[#8B4513] mb-1 flex items-center gap-1 font-label">
                <MapPin size={12} /> Location
              </div>
              <div className="text-sm text-[#5C2D0A] font-medium">{t.location}</div>
            </div>
            <div className="p-3 bg-[var(--card)] rounded-xl">
              <div className="text-xs text-[#8B4513] mb-1 flex items-center gap-1 font-label">
                <User size={12} /> Agent
              </div>
              <div className="text-xs text-[#5C2D0A] font-mono mb-1">{truncateAddress(t.agent || '')}</div>
              {/* {t.agent && <AgentBadge agentAddress={t.agent} />} */}
            </div>
            <div className="p-3 bg-[var(--card)] rounded-xl">
              <div className="text-xs text-[#8B4513] mb-1 flex items-center gap-1 font-label">
                <Clock size={12} /> Accept Before
              </div>
              <div className="text-sm text-[#5C2D0A]">{deadline.toLocaleDateString()}</div>
            </div>
            <div className="p-3 bg-[var(--card)] rounded-xl">
              <div className="text-xs text-[#8B4513] mb-1 flex items-center gap-1 font-label">
                <DollarSign size={12} /> Complete Before
              </div>
              <div className="text-sm text-[#5C2D0A]">{completionDeadline.toLocaleDateString()}</div>
            </div>
          </div>

          {/* Worker info */}
          {t.worker && t.worker !== '0x0000000000000000000000000000000000000000' && (
            <div className="p-3 bg-blue-900/10 rounded-xl border border-blue-400/30 mb-4">
              <div className="text-xs text-blue-800 mb-1 font-label flex items-center gap-1"><HardHat size={12} /> Worker</div>
              <div className="text-xs text-[#5C2D0A] font-mono break-all">{t.worker}</div>
            </div>
          )}

          {/* Proof */}
          {t.proofCID && (
            <div className="p-3 bg-[var(--card)] rounded-xl border border-[var(--border)] mb-4">
              <div className="text-xs text-[#D4700A] mb-1 font-label flex items-center gap-1"><Camera size={12} /> Proof (IPFS)</div>
              <a
                href={`https://gateway.pinata.cloud/ipfs/${t.proofCID}`}
                rel="noopener noreferrer"
                className="text-xs text-[#5C2D0A] font-mono break-all"
              >
                {t.proofCID}
              </a>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-4 pb-4">
          {/* Accept task */}
          {status === 0 && !isAgent && (
            <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
              <SelfVerify onVerified={() => setSelfVerified(true)} />
              <button
                onClick={() => {
                  if (!ensureChain()) return;
                  acceptWrite({ ...contractCall, functionName: 'acceptTask', args: [taskId], ...cip64 } as never);
                  toast('info', 'Confirm transaction in wallet...');
                }}
                disabled={accepting || acceptConfirming || !selfVerified}
                className="w-full py-3.5 bg-[#5C2D0A] hover:bg-[#6B3A1F] disabled:bg-[#8B4513] text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2 min-h-[48px]"
              >
                {accepting || acceptConfirming ? (
                  <><Loader2 size={16} className="animate-spin" /> {accepting ? 'Confirm in wallet...' : 'Confirming...'}</>
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
            <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
              <h2 className="text-lg font-semibold text-[#5C2D0A]">Submit Proof</h2>
              <ProofUpload taskId={taskId} onCIDReady={(cid) => setProofCID(cid)} />
              {!proofCID && (
                <>
                  <div className="text-xs text-[#8B4513] font-label">Or paste CID manually:</div>
                  <input
                    type="text"
                    value={proofCID}
                    onChange={(e) => setProofCID(e.target.value)}
                    placeholder="IPFS CID (e.g. QmXyz...)"
                    className="w-full px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[#5C2D0A] placeholder-[#8B4513] focus:outline-none focus:border-[#D4700A] text-sm"
                  />
                </>
              )}
              <button
                onClick={() => {
                  if (!ensureChain()) return;
                  submitWrite({ ...contractCall, functionName: 'submitProof', args: [taskId, proofCID], ...cip64 } as never);
                  toast('info', 'Submitting proof on-chain...');
                }}
                disabled={submitting || submitConfirming || !proofCID}
                className="w-full py-3.5 bg-[#D4700A] disabled:bg-[#8B4513] text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2 min-h-[48px]"
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
            <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl p-5">
              <h2 className="text-lg font-semibold text-[#5C2D0A] mb-4">Review Submission</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    if (!ensureChain()) return;
                    approveWrite({ ...contractCall, functionName: 'approveTask', args: [taskId], ...cip64 } as never);
                    toast('info', 'Approving task...');
                  }}
                  disabled={approvingTask || approveConfirming}
                  className="py-3.5 bg-green-600 disabled:bg-[#8B4513] text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2 min-h-[48px]"
                >
                  {approvingTask || approveConfirming ? (
                    <><Loader2 size={16} className="animate-spin" /> Approving...</>
                  ) : (
                    <><CheckCircle size={16} /> Approve & Pay</>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (!ensureChain()) return;
                    disputeWrite({ ...contractCall, functionName: 'disputeTask', args: [taskId], ...cip64 } as never);
                    toast('info', 'Disputing task...');
                  }}
                  disabled={disputing || disputeConfirming}
                  className="py-3.5 bg-red-500 disabled:bg-[#8B4513] text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2 min-h-[48px]"
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
            <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl p-5">
              <button
                onClick={() => {
                  if (!ensureChain()) return;
                  cancelWrite({ ...contractCall, functionName: 'cancelTask', args: [taskId], ...cip64 } as never);
                  toast('info', 'Cancelling task...');
                }}
                disabled={cancelling || cancelConfirming}
                className="w-full py-3.5 bg-[var(--card)] text-[#5C2D0A] font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2 min-h-[48px]"
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
            <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-[#5C2D0A] mb-3 flex items-center gap-1"><Star size={14} /> Rate</h3>
              <div className="flex items-center gap-3 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`transition min-w-[44px] min-h-[44px] flex items-center justify-center ${star <= rating ? 'text-[#D4700A]' : 'text-[var(--border)]'}`}
                  >
                    <Star size={28} fill={star <= rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              {isAgent && (
                <button
                  onClick={() => {
                    if (!ensureChain()) return;
                    rateWorkerWrite({ ...contractCall, functionName: 'rateWorker', args: [taskId, rating], ...cip64 } as never);
                    toast('info', 'Rating worker...');
                  }}
                  disabled={ratingWorker || rateWorkerConfirming}
                  className="w-full py-3 bg-[#5C2D0A] hover:bg-[#3F1D06] disabled:bg-[#8B4513] text-white rounded-xl transition text-sm font-medium flex items-center justify-center gap-2 min-h-[48px]"
                >
                  {ratingWorker || rateWorkerConfirming ? <><Loader2 size={16} className="animate-spin" /> Rating...</> : 'Rate Worker'}
                </button>
              )}
              {isWorker && (
                <button
                  onClick={() => {
                    if (!ensureChain()) return;
                    rateAgentWrite({ ...contractCall, functionName: 'rateAgent', args: [taskId, rating], ...cip64 } as never);
                    toast('info', 'Rating agent...');
                  }}
                  disabled={ratingAgent || rateAgentConfirming}
                  className="w-full py-3 bg-[#5C2D0A] hover:bg-[#3F1D06] disabled:bg-[#8B4513] text-white rounded-xl transition text-sm font-medium flex items-center justify-center gap-2 min-h-[48px]"
                >
                  {ratingAgent || rateAgentConfirming ? <><Loader2 size={16} className="animate-spin" /> Rating...</> : 'Rate Agent'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
