'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { parseUnits } from 'viem';
import { DollarSign, Clock, MapPin, FileText } from 'lucide-react';
import gsap from 'gsap';
import { AGENTHANDS_ADDRESS, USDC_ADDRESSES } from '@/config';
import AgentHandsABI from '@/abi/AgentHands.json';
import { toast } from '@/components/Toast';

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

export default function NewTaskPage() {
  const router = useRouter();
  const { isConnected } = useAppKitAccount();
  const { caipNetwork } = useAppKitNetwork();
  const chainId = caipNetwork?.id ? Number(String(caipNetwork.id).split(':')[1] || caipNetwork.id) : 0;
  const formRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [reward, setReward] = useState('');
  const [deadlineHours, setDeadlineHours] = useState('24');
  const [completionHours, setCompletionHours] = useState('72');
  const [step, setStep] = useState<'form' | 'approve' | 'create' | 'done'>('form');

  const { writeContract: approveWrite, data: approveTx, isPending: approving } = useWriteContract();
  const { writeContract: createWrite, data: createTx, isPending: creating } = useWriteContract();

  const { isLoading: waitingApprove, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveTx });

  const { isLoading: waitingCreate, isSuccess: createSuccess } =
    useWaitForTransactionReceipt({ hash: createTx });

  const usdcAddress = USDC_ADDRESSES[chainId];

  useEffect(() => {
    if (formRef.current) {
      const ctx = gsap.context(() => {
        gsap.from('.form-content', {
          opacity: 0,
          y: 20,
          duration: 0.5,
          ease: 'power2.out',
        });
      }, formRef);
      return () => ctx.revert();
    }
  }, [step]);

  const handleApprove = () => {
    if (!usdcAddress) return;
    const amount = parseUnits(reward, 6);
    approveWrite({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [AGENTHANDS_ADDRESS, amount],
    });
    setStep('approve');
    toast('info', 'Approve USDC in your wallet...');
  };

  const handleCreate = () => {
    if (!usdcAddress) return;
    const amount = parseUnits(reward, 6);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(deadlineHours) * 3600);
    const completionDeadline = BigInt(Math.floor(Date.now() / 1000) + Number(completionHours) * 3600);

    createWrite({
      address: AGENTHANDS_ADDRESS,
      abi: AgentHandsABI as typeof AgentHandsABI,
      functionName: 'createTask',
      args: [usdcAddress, amount, deadline, completionDeadline, title, description, location],
    });
    setStep('create');
    toast('info', 'Creating task on-chain...');
  };

  if (createSuccess) {
    return (
      <div ref={formRef} className="mx-auto w-full max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="form-content bg-white border border-green-200 rounded-xl p-8">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-[#1A0F08] mb-2">Task Created! 🎉</h2>
          <p className="text-[#6B5040] mb-6">USDC is locked in escrow. Workers can now accept your task.</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/tasks')}
              className="px-6 py-2.5 bg-[#1A0F08] hover:bg-[#2a1a0c] text-white font-semibold rounded-lg transition text-sm"
            >
              View Tasks
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2.5 bg-[#FFF2E8] hover:bg-[#F5DEC8] text-[#1A0F08] font-semibold rounded-lg transition text-sm border border-[#F5DEC8]"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={formRef} className="mx-auto w-full max-w-2xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl tracking-tight text-[#1A0F08] mb-8 font-bold">Post a Task</h1>

      {!isConnected ? (
        <div className="form-content text-center py-16 bg-white border border-[#F5DEC8] rounded-xl p-8">
          <h2 className="text-xl font-semibold text-[#1A0F08] mb-4">Connect Your Wallet</h2>
          <p className="text-[#6B5040] mb-6">Connect your wallet to post a task</p>
          <appkit-button />
        </div>
      ) : !usdcAddress ? (
        <div className="form-content text-center py-10 bg-[#FFF2E8] rounded-xl border border-[#F5DEC8] p-6">
          <p className="text-[#D4700A] font-medium">
            ⚠️ Switch to Base Sepolia or Celo Sepolia to post tasks
          </p>
          <div className="mt-4">
            <appkit-network-button />
          </div>
        </div>
      ) : (
        <div className="form-content bg-white border border-[#F5DEC8] rounded-xl p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium font-label text-[#1A0F08] mb-1.5">
              <FileText size={14} className="inline mr-1" />
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Pick up documents from city hall"
              maxLength={200}
              className="w-full bg-[#FFFAF5] border border-[#F5DEC8] rounded-lg px-4 py-2.5 text-sm text-[#1A0F08] placeholder-[#A07858] focus:outline-none focus:border-[#FF8C42]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium font-label text-[#1A0F08] mb-1.5">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what needs to be done in detail..."
              rows={5}
              className="w-full bg-[#FFFAF5] border border-[#F5DEC8] rounded-lg px-4 py-2.5 text-sm text-[#1A0F08] placeholder-[#A07858] focus:outline-none focus:border-[#FF8C42] resize-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium font-label text-[#1A0F08] mb-1.5">
              <MapPin size={14} className="inline mr-1" />
              Location *
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. City Hall, Jakarta"
              className="w-full bg-[#FFFAF5] border border-[#F5DEC8] rounded-lg px-4 py-2.5 text-sm text-[#1A0F08] placeholder-[#A07858] focus:outline-none focus:border-[#FF8C42]"
            />
          </div>

          {/* Reward */}
          <div>
            <label className="block text-sm font-medium font-label text-[#1A0F08] mb-1.5">
              <DollarSign size={14} className="inline mr-1" />
              Reward (USDC) *
            </label>
            <input
              type="number"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              placeholder="e.g. 10"
              min="0.01"
              step="0.01"
              className="w-full bg-[#FFFAF5] border border-[#F5DEC8] rounded-lg px-4 py-2.5 text-sm text-[#1A0F08] placeholder-[#A07858] focus:outline-none focus:border-[#FF8C42]"
            />
          </div>

          {/* Deadlines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium font-label text-[#1A0F08] mb-1.5">
                <Clock size={14} className="inline mr-1" />
                Accept Deadline (hours)
              </label>
              <input
                type="number"
                value={deadlineHours}
                onChange={(e) => setDeadlineHours(e.target.value)}
                className="w-full bg-[#FFFAF5] border border-[#F5DEC8] rounded-lg px-4 py-2.5 text-sm text-[#1A0F08] focus:outline-none focus:border-[#FF8C42]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium font-label text-[#1A0F08] mb-1.5">
                Completion Deadline (hours)
              </label>
              <input
                type="number"
                value={completionHours}
                onChange={(e) => setCompletionHours(e.target.value)}
                className="w-full bg-[#FFFAF5] border border-[#F5DEC8] rounded-lg px-4 py-2.5 text-sm text-[#1A0F08] focus:outline-none focus:border-[#FF8C42]"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[#FFFAF5] border border-[#F5DEC8] rounded-lg p-4 space-y-2 text-sm font-label">
            <div className="flex justify-between">
              <span className="text-[#6B5040]">Chain</span>
              <span className="text-[#1A0F08]">{caipNetwork?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B5040]">Payment</span>
              <span className="text-[#D4700A] font-semibold">{reward || '0'} USDC (escrow)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B5040]">Platform fee</span>
              <span className="text-[#1A0F08]">2.5%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B5040]">Worker receives</span>
              <span className="text-[#D4700A]">{reward ? (Number(reward) * 0.975).toFixed(2) : '0'} USDC</span>
            </div>
          </div>

          {step === 'form' && (
            <button
              onClick={handleApprove}
              disabled={!title || !description || !location || !reward}
              className="w-full bg-[#1A0F08] hover:bg-[#2a1a0c] disabled:bg-[#A07858] text-white py-3 rounded-lg font-medium font-label transition-colors text-sm"
            >
              Step 1: Approve USDC
            </button>
          )}

          {step === 'approve' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-label">
                {waitingApprove ? (
                  <span className="text-[#D4700A]">⏳ Approving USDC...</span>
                ) : approveSuccess ? (
                  <span className="text-green-600">✅ USDC Approved!</span>
                ) : approving ? (
                  <span className="text-[#D4700A]">🔐 Confirm in wallet...</span>
                ) : null}
              </div>
              <button
                onClick={handleCreate}
                disabled={!approveSuccess}
                className="w-full bg-[#1A0F08] hover:bg-[#2a1a0c] disabled:bg-[#A07858] text-white py-3 rounded-lg font-medium font-label transition-colors text-sm"
              >
                Step 2: Create Task
              </button>
            </div>
          )}

          {step === 'create' && (
            <div className="flex items-center gap-2 text-sm font-label">
              {waitingCreate ? (
                <span className="text-[#D4700A]">⏳ Creating task...</span>
              ) : creating ? (
                <span className="text-[#D4700A]">🔐 Confirm in wallet...</span>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
