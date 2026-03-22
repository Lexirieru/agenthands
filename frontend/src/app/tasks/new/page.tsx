"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { parseUnits } from "viem";
import { AGENTHANDS_ADDRESS, USDC_ADDRESSES } from "@/config";
import AgentHandsABI from "@/abi/AgentHands.json";
import Navbar from "@/components/Navbar";

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export default function NewTaskPage() {
  const router = useRouter();
  const { address, isConnected } = useAppKitAccount();
  const { caipNetwork } = useAppKitNetwork();
  const chainId = caipNetwork?.id ? Number(String(caipNetwork.id).split(":")[1] || caipNetwork.id) : 0;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [reward, setReward] = useState("");
  const [deadlineHours, setDeadlineHours] = useState("24");
  const [completionHours, setCompletionHours] = useState("72");
  const [step, setStep] = useState<"form" | "approve" | "create" | "done">("form");

  const { writeContract: approveWrite, data: approveTx, isPending: approving } = useWriteContract();
  const { writeContract: createWrite, data: createTx, isPending: creating } = useWriteContract();

  const { isLoading: waitingApprove, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveTx });

  const { isLoading: waitingCreate, isSuccess: createSuccess } =
    useWaitForTransactionReceipt({ hash: createTx });

  const usdcAddress = USDC_ADDRESSES[chainId];

  // Step 1: Approve USDC
  const handleApprove = () => {
    if (!usdcAddress) return;
    const amount = parseUnits(reward, 6);
    approveWrite({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [AGENTHANDS_ADDRESS, amount],
    });
    setStep("approve");
  };

  // Step 2: Create Task
  const handleCreate = () => {
    if (!usdcAddress) return;
    const amount = parseUnits(reward, 6);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(deadlineHours) * 3600);
    const completionDeadline = BigInt(Math.floor(Date.now() / 1000) + Number(completionHours) * 3600);

    createWrite({
      address: AGENTHANDS_ADDRESS,
      abi: AgentHandsABI as any,
      functionName: "createTask",
      args: [usdcAddress, amount, deadline, completionDeadline, title, description, location],
    });
    setStep("create");
  };

  if (createSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-white mb-4">Task Created!</h1>
          <p className="text-gray-400 mb-8">
            Your task has been posted and USDC is locked in escrow.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push("/tasks")}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition"
            >
              View Tasks
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg border border-gray-700 transition"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-white mb-2">Post a Task</h1>
        <p className="text-gray-400 mb-8">
          Create a task for human workers. USDC will be locked in escrow.
        </p>

        {!isConnected ? (
          <div className="text-center py-10">
            <p className="text-gray-400 mb-4">Connect your wallet to post a task</p>
            <appkit-button />
          </div>
        ) : !usdcAddress ? (
          <div className="text-center py-10 bg-red-500/10 rounded-xl border border-red-500/20 p-6">
            <p className="text-red-400">
              ⚠️ Switch to Base Sepolia or Celo Sepolia to post tasks
            </p>
            <appkit-network-button />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Task Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Pick up documents from city hall"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe what needs to be done in detail..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                📍 Location *
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. City Hall, Jakarta"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Reward */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                💰 Reward (USDC) *
              </label>
              <input
                type="number"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="e.g. 10"
                min="0.01"
                step="0.01"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Deadlines */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ⏰ Accept Deadline (hours)
                </label>
                <input
                  type="number"
                  value={deadlineHours}
                  onChange={(e) => setDeadlineHours(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  🏁 Completion Deadline (hours)
                </label>
                <input
                  type="number"
                  value={completionHours}
                  onChange={(e) => setCompletionHours(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="text-sm text-gray-400">
                <p>Chain: <span className="text-white">{caipNetwork?.name}</span></p>
                <p>Payment: <span className="text-emerald-400">{reward || "0"} USDC</span> (locked in escrow)</p>
                <p>Platform fee: <span className="text-white">2.5%</span></p>
                <p>Worker receives: <span className="text-emerald-400">{reward ? (Number(reward) * 0.975).toFixed(2) : "0"} USDC</span></p>
              </div>
            </div>

            {/* Actions */}
            {step === "form" && (
              <button
                onClick={handleApprove}
                disabled={!title || !description || !location || !reward}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition"
              >
                Step 1: Approve USDC
              </button>
            )}

            {step === "approve" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  {waitingApprove ? (
                    <span className="text-yellow-400">⏳ Approving USDC...</span>
                  ) : approveSuccess ? (
                    <span className="text-green-400">✅ USDC Approved!</span>
                  ) : approving ? (
                    <span className="text-yellow-400">🔐 Confirm in wallet...</span>
                  ) : null}
                </div>
                <button
                  onClick={handleCreate}
                  disabled={!approveSuccess}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition"
                >
                  Step 2: Create Task
                </button>
              </div>
            )}

            {step === "create" && (
              <div className="flex items-center gap-2 text-sm">
                {waitingCreate ? (
                  <span className="text-yellow-400">⏳ Creating task...</span>
                ) : creating ? (
                  <span className="text-yellow-400">🔐 Confirm in wallet...</span>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
