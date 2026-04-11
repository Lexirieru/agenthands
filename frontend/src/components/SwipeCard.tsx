"use client";

import Link from "next/link";
import { MapPin, Clock, User, Heart, Share2, Info, ChevronRight, CheckCircle2 } from "lucide-react";
import { formatUSDC, getStatusDisplay, truncateAddress } from "@/lib/utils/format";
import type { TaskData } from "@/types/task";

interface Props {
  task: TaskData;
  index: number;
  total: number;
}

export default function SwipeCard({ task, index, total }: Props) {
  const status = Number(task.status);
  const statusInfo = getStatusDisplay(status);
  const deadlineDate = new Date(Number(task.deadline) * 1000);
  const isExpired = deadlineDate < new Date() && status === 0;
  const rewardFormatted = formatUSDC(task.reward);

  return (
    <div className="h-full w-full bg-[#000000] flex flex-col relative overflow-hidden text-white font-sans">
      {/* ── Background Immersive ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 z-0" />

      {/* ── Content Area ── */}
      <div className="relative z-10 flex-1 flex flex-col pt-16 pb-24 px-4">

        {/* Main Reward Visual (TikTok Video Replacement) */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative group scale-110">
            {/* Animated Glow behind Reward */}
            <div className="absolute inset-0 bg-[#D4700A]/30 blur-3xl rounded-full animate-pulse" />

            <div className="relative flex flex-col items-center">
              <div className="w-28 h-28 rounded-full bg-[#2775CA] flex items-center justify-center p-5 shadow-2xl mb-6 ring-4 ring-black/20">
                <img src="https://cdn.morpho.org/assets/logos/usdc.svg" alt="USDC" className="w-full h-full" />
              </div>
              <h1 className="text-7xl font-bold tracking-tighter text-white drop-shadow-lg">
                ${rewardFormatted}
              </h1>
              <p className="text-[10px] uppercase tracking-[0.4em] font-black text-[#D4700A] mt-2 drop-shadow-md">
                USDC REWARD
              </p>
            </div>
          </div>
        </div>

        {/* ── Bottom Info Overlay (TikTok Style) ── */}
        <div className="mt-auto max-w-[82%] animate-slide-in drop-shadow-xl">
          <div className="flex items-center gap-2 mb-3">
             <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden">
                <User size={18} className="text-white" />
             </div>
             <span className="text-sm font-bold tracking-tight text-white shadow-black drop-shadow-md">
               @{truncateAddress(task.agent)}
             </span>
             <div className="bg-[#D4700A] px-2 py-0.5 rounded text-[10px] font-black text-black uppercase">
               AGENT
             </div>
          </div>

          <h2 className="text-xl font-bold text-white mb-2 leading-tight drop-shadow-md">
            {task.title}
          </h2>

          <p className="text-sm text-white/90 line-clamp-2 mb-4 leading-relaxed drop-shadow-sm font-medium">
            {task.description}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <MapPin size={12} className="text-[#D4700A]" />
              <span className="line-clamp-1">{task.location}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <Clock size={12} className={isExpired ? "text-red-500" : "text-[#D4700A]"} />
              <span>{isExpired ? "Expired" : deadlineDate.toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right-side Actions (TikTok Style) ── */}
      <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5">

        {/* Status / Check - Done/Open Style */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={(e) => {
              e.preventDefault();
            }}
            className={`w-12 h-12 rounded-full border-2 border-white/80 flex items-center justify-center shadow-lg active:scale-90 transition-transform ${
             status === 3 ? "bg-[#22c55e]" : "bg-[#D4700A]"
          }`}>
             {status === 3 ? <CheckCircle2 size={22} className="text-white fill-none" /> : <Heart size={22} className="text-white fill-white" />}
          </button>
          <span className="text-[10px] font-bold text-white shadow-black drop-shadow-md uppercase">
            {status === 3 ? "Done" : "Open"}
          </span>
        </div>

        {/* Detail Button */}
        <Link href={`/tasks/${task.id?.toString() || "0"}`} className="flex flex-col items-center gap-1 group">
          <div className="w-12 h-12 rounded-full border-2 border-white/80 bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg group-active:scale-90 transition-transform">
             <ChevronRight size={26} className="text-white" />
          </div>
          <span className="text-[10px] font-bold text-white shadow-black drop-shadow-md">Details</span>
        </Link>

        {/* Share Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            if (navigator.share) {
              navigator.share({
                title: task.title,
                text: task.description,
                url: window.location.origin + `/tasks/${task.id?.toString()}`,
              }).catch(() => {});
            }
          }}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="w-12 h-12 rounded-full border-2 border-white/80 bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg group-active:scale-90 transition-transform">
             <Share2 size={22} className="text-white" />
          </div>
          <span className="text-[10px] font-bold text-white shadow-black drop-shadow-md">Share</span>
        </button>
      </div>

      {/* ── Bottom Action Bar (Accept Task) ── */}
      <div className="absolute bottom-0 inset-x-0 z-30 p-4 bg-gradient-to-t from-black to-transparent pt-12 pb-6">
        {status === 0 && !isExpired ? (
          <Link
            href={`/tasks/${task.id?.toString() || "0"}`}
            className="w-full py-4 rounded-xl bg-white text-black font-black text-base text-center shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            ACCEPT TASK <ChevronRight size={18} />
          </Link>
        ) : (
          <div className="w-full py-4 rounded-xl bg-white/10 backdrop-blur-md text-white/60 font-black text-base text-center border border-white/10">
            {isExpired ? "EXPIRED" : "COMPLETED"}
          </div>
        )}
      </div>

      {/* Top Index Indicator */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-black/40 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/10 text-[11px] font-black tracking-widest text-white/80">
        {index + 1} / {total}
      </div>
    </div>
  );
}
