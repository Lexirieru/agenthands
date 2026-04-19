'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useConnect, useSwitchChain } from 'wagmi';
import { parseUnits } from 'viem';
import { DollarSign, Clock, MapPin, FileText, CheckCircle, Loader2, Lock, Wallet } from 'lucide-react';
import gsap from 'gsap';
import { AGENTHANDS_ADDRESS, USDC_ADDRESS, USDC_FEE_ADAPTER, CHAIN } from '@/config';
import AgentHandsABI from '@/abi/AgentHands.json';
import { toast } from '@/components/Toast';
import { useInvalidateTasks } from '@/hooks/useTasks';

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
  const { isConnected, chainId: currentChainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { switchChain } = useSwitchChain();
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

  const { invalidateList } = useInvalidateTasks();

  useEffect(() => {
    if (createSuccess) invalidateList();
  }, [createSuccess, invalidateList]);

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

  const ensureChain = () => {
    if (currentChainId !== CHAIN.id) {
      switchChain({ chainId: CHAIN.id });
      toast('info', 'Switching to Celo Sepolia...');
      return false;
    }
    return true;
  };

  const handleApprove = () => {
    if (!ensureChain()) return;
    const amount = parseUnits(reward, 6);
    approveWrite({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [AGENTHANDS_ADDRESS, amount],
      feeCurrency: USDC_FEE_ADAPTER, type: 'cip64',
    } as any);
    setStep('approve');
    toast('info', 'Approve USDC in your wallet...');
  };

  const handleCreate = () => {
    if (!ensureChain()) return;
    const amount = parseUnits(reward, 6);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(deadlineHours) * 3600);
    const completionDeadline = BigInt(Math.floor(Date.now() / 1000) + Number(completionHours) * 3600);

    createWrite({
      address: AGENTHANDS_ADDRESS,
      abi: AgentHandsABI as typeof AgentHandsABI,
      functionName: 'createTask',
      args: [USDC_ADDRESS, amount, deadline, completionDeadline, title, description, location],
      feeCurrency: USDC_FEE_ADAPTER, type: 'cip64',
    } as any);
    setStep('create');
    toast('info', 'Creating task on-chain...');
  };

  if (createSuccess) {
    return (
      <div ref={formRef} className="flex items-center justify-center min-h-[calc(100dvh-7.5rem)] px-4">
        <div className="form-content bg-[var(--card-solid)] border border-green-400/30 rounded-2xl p-8 text-center w-full max-w-md">
          <div className="w-16 h-16 rounded-full bg-green-900/10 flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-[#5C2D0A] mb-2">Task Created!</h2>
          <p className="text-sm text-[#5C2D0A] mb-6">USDC is locked in escrow. Workers can now accept your task.</p>
          <button
            onClick={() => router.push('/tasks')}
            className="w-full py-3.5 bg-[#5C2D0A] text-white font-semibold rounded-xl transition text-sm min-h-[48px]"
          >
            View Tasks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={formRef} className="min-h-[calc(100dvh-7.5rem)] px-4 py-6 md:py-12 overflow-y-auto mx-auto w-full max-w-2xl">
      <h1 className="text-2xl md:text-4xl font-bold text-[#5C2D0A] mb-6 md:mb-8 font-heading">Post a Task</h1>

      {!isConnected ? (
        <div className="form-content flex flex-col items-center py-16 bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl p-8">
          <div className="w-20 h-20 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center mb-4">
            <Wallet size={32} className="text-[#8B4513]" />
          </div>
          <h2 className="text-lg font-semibold text-[#5C2D0A] mb-2">Connect Wallet</h2>
          <p className="text-sm text-[#8B4513] mb-6">Connect to post a task</p>
          <button
            onClick={() => {
              const connector = connectors.find(c => c.id === 'injected') || connectors[0];
              if (connector) connect({ connector });
            }}
            className="flex items-center gap-2 px-8 py-3 bg-[#5C2D0A] text-white font-semibold rounded-xl text-sm active:scale-[0.98] transition-transform min-h-[48px]"
          >
            <Wallet size={16} />
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="form-content bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl p-5 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium font-label text-[#5C2D0A] mb-1.5">
              <FileText size={14} className="inline mr-1" />
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Pick up documents from city hall"
              maxLength={200}
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-base text-[#5C2D0A] placeholder-[#8B4513] focus:outline-none focus:border-[#D4700A]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium font-label text-[#5C2D0A] mb-1.5">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what needs to be done..."
              rows={4}
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-base text-[#5C2D0A] placeholder-[#8B4513] focus:outline-none focus:border-[#D4700A] resize-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium font-label text-[#5C2D0A] mb-1.5">
              <MapPin size={14} className="inline mr-1" />
              Location *
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. City Hall, Jakarta"
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-base text-[#5C2D0A] placeholder-[#8B4513] focus:outline-none focus:border-[#D4700A]"
            />
          </div>

          {/* Reward */}
          <div>
            <label className="block text-sm font-medium font-label text-[#5C2D0A] mb-1.5">
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
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-base text-[#5C2D0A] placeholder-[#8B4513] focus:outline-none focus:border-[#D4700A]"
            />
          </div>

          {/* Deadlines */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium font-label text-[#5C2D0A] mb-1.5">
                <Clock size={14} className="inline mr-1" />
                Accept (hours)
              </label>
              <input
                type="number"
                value={deadlineHours}
                onChange={(e) => setDeadlineHours(e.target.value)}
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-base text-[#5C2D0A] focus:outline-none focus:border-[#D4700A]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium font-label text-[#5C2D0A] mb-1.5">
                Complete (hours)
              </label>
              <input
                type="number"
                value={completionHours}
                onChange={(e) => setCompletionHours(e.target.value)}
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-base text-[#5C2D0A] focus:outline-none focus:border-[#D4700A]"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-2 text-sm font-label">
            <div className="flex justify-between">
              <span className="text-[#8B4513]">Chain</span>
              <span className="text-[#5C2D0A] font-medium">Celo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8B4513]">Payment</span>
              <span className="text-[#D4700A] font-semibold">{reward || '0'} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8B4513]">Platform fee</span>
              <span className="text-[#5C2D0A]">2.5%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8B4513]">Worker receives</span>
              <span className="text-[#D4700A]">{reward ? (Number(reward) * 0.975).toFixed(2) : '0'} USDC</span>
            </div>
          </div>

          {step === 'form' && (
            <button
              onClick={handleApprove}
              disabled={!title || !description || !location || !reward}
              className="w-full bg-[#5C2D0A] disabled:bg-[#8B4513] text-white py-3.5 rounded-xl font-medium font-label transition text-sm min-h-[48px]"
            >
              Step 1: Approve USDC
            </button>
          )}

          {step === 'approve' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-label">
                {waitingApprove ? (
                  <span className="text-[#D4700A] inline-flex items-center gap-1"><Loader2 size={14} className="animate-spin" /> Approving USDC...</span>
                ) : approveSuccess ? (
                  <span className="text-green-600 inline-flex items-center gap-1"><CheckCircle size={14} /> USDC Approved!</span>
                ) : approving ? (
                  <span className="text-[#D4700A] inline-flex items-center gap-1"><Lock size={14} /> Confirm in wallet...</span>
                ) : null}
              </div>
              <button
                onClick={handleCreate}
                disabled={!approveSuccess}
                className="w-full bg-[#5C2D0A] disabled:bg-[#8B4513] text-white py-3.5 rounded-xl font-medium font-label transition text-sm min-h-[48px]"
              >
                Step 2: Create Task
              </button>
            </div>
          )}

          {step === 'create' && (
            <div className="flex items-center gap-2 text-sm font-label">
              {waitingCreate ? (
                <span className="text-[#D4700A] inline-flex items-center gap-1"><Loader2 size={14} className="animate-spin" /> Creating task...</span>
              ) : creating ? (
                <span className="text-[#D4700A] inline-flex items-center gap-1"><Lock size={14} /> Confirm in wallet...</span>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
