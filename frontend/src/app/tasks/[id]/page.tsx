"use client";

import { use, useState } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import { AGENTHANDS_ADDRESS } from "@/config";
import AgentHandsABI from "@/abi/AgentHands.json";
import Navbar from "@/components/Navbar";

const STATUS_LABELS: Record<number, { label: string; color: string; emoji: string }> = {
  0: { label: "Open", color: "bg-emerald-500/20 text-emerald-400", emoji: "🟢" },
  1: { label: "Accepted", color: "bg-blue-500/20 text-blue-400", emoji: "🔵" },
  2: { label: "Proof Submitted", color: "bg-yellow-500/20 text-yellow-400", emoji: "📸" },
  3: { label: "Completed", color: "bg-green-500/20 text-green-400", emoji: "✅" },
  4: { label: "Disputed", color: "bg-red-500/20 text-red-400", emoji: "⚠️" },
  5: { label: "Cancelled", color: "bg-gray-500/20 text-gray-400", emoji: "❌" },
  6: { label: "Expired", color: "bg-gray-500/20 text-gray-400", emoji: "⏰" },
};

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const taskId = BigInt(id);
  const { address } = useAppKitAccount();
  const [proofCID, setProofCID] = useState("");
  const [rating, setRating] = useState(5);

  const { data: task, isLoading, refetch } = useReadContract({
    address: AGENTHANDS_ADDRESS,
    abi: AgentHandsABI as any,
    functionName: "getTask",
    args: [taskId],
  });

  const { writeContract: acceptWrite, data: acceptTx, isPending: accepting } = useWriteContract();
  const { writeContract: submitWrite, data: submitTx, isPending: submitting } = useWriteContract();
  const { writeContract: approveWrite, data: approveTxHash, isPending: approvingTask } = useWriteContract();
  const { writeContract: disputeWrite, data: disputeTx, isPending: disputing } = useWriteContract();
  const { writeContract: cancelWrite, data: cancelTx, isPending: cancelling } = useWriteContract();
  const { writeContract: rateWorkerWrite, isPending: ratingWorker } = useWriteContract();
  const { writeContract: rateAgentWrite, isPending: ratingAgent } = useWriteContract();

  const { isSuccess: acceptSuccess } = useWaitForTransactionReceipt({ hash: acceptTx });
  const { isSuccess: submitSuccess } = useWaitForTransactionReceipt({ hash: submitTx });
  const { isSuccess: approveTaskSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isSuccess: cancelSuccess } = useWaitForTransactionReceipt({ hash: cancelTx });

  // Refetch on any success
  if (acceptSuccess || submitSuccess || approveTaskSuccess || cancelSuccess) {
    refetch();
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <Navbar />
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <Navbar />
        <div className="text-center py-20">
          <h1 className="text-2xl text-white">Task not found</h1>
        </div>
      </div>
    );
  }

  const t = task as any;
  const status = Number(t.status);
  const statusInfo = STATUS_LABELS[status] || STATUS_LABELS[0];
  const rewardFormatted = (Number(t.reward) / 1e6).toFixed(2);
  const isAgent = address?.toLowerCase() === t.agent?.toLowerCase();
  const isWorker = address?.toLowerCase() === t.worker?.toLowerCase();
  const deadline = new Date(Number(t.deadline) * 1000);
  const completionDeadline = new Date(Number(t.completionDeadline) * 1000);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusInfo.color}`}>
                {statusInfo.emoji} {statusInfo.label}
              </span>
              <span className="text-sm text-gray-500">Task #{id}</span>
            </div>
            <h1 className="text-3xl font-bold text-white">{t.title}</h1>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-emerald-400">${rewardFormatted}</div>
            <div className="text-sm text-gray-500">USDC</div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <h2 className="text-lg font-semibold text-white mb-3">Description</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{t.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <div className="text-sm text-gray-500 mb-1">📍 Location</div>
              <div className="text-white">{t.location}</div>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <div className="text-sm text-gray-500 mb-1">🤖 Agent</div>
              <div className="text-white font-mono text-sm">
                {t.agent?.slice(0, 8)}...{t.agent?.slice(-6)}
              </div>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <div className="text-sm text-gray-500 mb-1">⏰ Accept Before</div>
              <div className="text-white">{deadline.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <div className="text-sm text-gray-500 mb-1">🏁 Complete Before</div>
              <div className="text-white">{completionDeadline.toLocaleString()}</div>
            </div>
          </div>

          {/* Worker info */}
          {t.worker && t.worker !== "0x0000000000000000000000000000000000000000" && (
            <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <div className="text-sm text-blue-400 mb-1">👷 Worker</div>
              <div className="text-white font-mono text-sm">{t.worker}</div>
            </div>
          )}

          {/* Proof */}
          {t.proofCID && (
            <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
              <div className="text-sm text-yellow-400 mb-1">📸 Proof (IPFS)</div>
              <a
                href={`https://gateway.pinata.cloud/ipfs/${t.proofCID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-emerald-400 font-mono text-sm break-all"
              >
                {t.proofCID}
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {/* Worker: Accept Task */}
            {status === 0 && !isAgent && (
              <button
                onClick={() =>
                  acceptWrite({
                    address: AGENTHANDS_ADDRESS,
                    abi: AgentHandsABI as any,
                    functionName: "acceptTask",
                    args: [taskId],
                  })
                }
                disabled={accepting}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 text-white font-semibold rounded-lg transition"
              >
                {accepting ? "Accepting..." : "✋ Accept This Task"}
              </button>
            )}

            {/* Worker: Submit Proof */}
            {status === 1 && isWorker && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={proofCID}
                  onChange={(e) => setProofCID(e.target.value)}
                  placeholder="IPFS CID (e.g. QmXyz...)"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() =>
                    submitWrite({
                      address: AGENTHANDS_ADDRESS,
                      abi: AgentHandsABI as any,
                      functionName: "submitProof",
                      args: [taskId, proofCID],
                    })
                  }
                  disabled={submitting || !proofCID}
                  className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-700 text-white font-semibold rounded-lg transition"
                >
                  {submitting ? "Submitting..." : "📸 Submit Proof"}
                </button>
              </div>
            )}

            {/* Agent: Approve or Dispute */}
            {status === 2 && isAgent && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() =>
                    approveWrite({
                      address: AGENTHANDS_ADDRESS,
                      abi: AgentHandsABI as any,
                      functionName: "approveTask",
                      args: [taskId],
                    })
                  }
                  disabled={approvingTask}
                  className="py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-white font-semibold rounded-lg transition"
                >
                  {approvingTask ? "Approving..." : "✅ Approve & Pay"}
                </button>
                <button
                  onClick={() =>
                    disputeWrite({
                      address: AGENTHANDS_ADDRESS,
                      abi: AgentHandsABI as any,
                      functionName: "disputeTask",
                      args: [taskId],
                    })
                  }
                  disabled={disputing}
                  className="py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-700 text-white font-semibold rounded-lg transition"
                >
                  {disputing ? "Disputing..." : "⚠️ Dispute"}
                </button>
              </div>
            )}

            {/* Agent: Cancel open task */}
            {status === 0 && isAgent && (
              <button
                onClick={() =>
                  cancelWrite({
                    address: AGENTHANDS_ADDRESS,
                    abi: AgentHandsABI as any,
                    functionName: "cancelTask",
                    args: [taskId],
                  })
                }
                disabled={cancelling}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition"
              >
                {cancelling ? "Cancelling..." : "Cancel Task"}
              </button>
            )}

            {/* Ratings for completed tasks */}
            {status === 3 && (isAgent || isWorker) && (
              <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                <h3 className="text-sm font-semibold text-white mb-3">⭐ Rate</h3>
                <div className="flex items-center gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`text-2xl ${star <= rating ? "text-yellow-400" : "text-gray-600"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                {isAgent && (
                  <button
                    onClick={() =>
                      rateWorkerWrite({
                        address: AGENTHANDS_ADDRESS,
                        abi: AgentHandsABI as any,
                        functionName: "rateWorker",
                        args: [taskId, rating],
                      })
                    }
                    disabled={ratingWorker}
                    className="w-full py-2 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-lg transition text-sm"
                  >
                    {ratingWorker ? "Rating..." : "Rate Worker"}
                  </button>
                )}
                {isWorker && (
                  <button
                    onClick={() =>
                      rateAgentWrite({
                        address: AGENTHANDS_ADDRESS,
                        abi: AgentHandsABI as any,
                        functionName: "rateAgent",
                        args: [taskId, rating],
                      })
                    }
                    disabled={ratingAgent}
                    className="w-full py-2 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-lg transition text-sm"
                  >
                    {ratingAgent ? "Rating..." : "Rate Agent"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
