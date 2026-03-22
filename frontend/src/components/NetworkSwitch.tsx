"use client";

import { useState, useRef, useEffect } from "react";
import { useAppKitNetwork } from "@reown/appkit/react";
import { baseSepolia, celoSepolia } from "@reown/appkit/networks";
import { getChainInfo } from "./ChainBadge";

const NETWORKS = [
  { chain: baseSepolia, id: 84532 },
  { chain: celoSepolia, id: 11142220 },
];

export default function NetworkSwitch() {
  const { chainId, switchNetwork } = useAppKitNetwork();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentChain = getChainInfo(chainId as number || 84532);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card-solid)] hover:bg-[var(--card)] border border-[var(--border)] hover:border-[#D4700A] rounded-full transition text-sm"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={currentChain.logo} alt="" className="h-4 w-4 rounded-full" />
        <span className="text-[#5C2D0A] text-xs font-label">{currentChain.name}</span>
        <svg className={`w-3 h-3 text-[#8B4513] transition ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-[var(--card-solid)] border border-[var(--border)] rounded-xl shadow-lg z-50 overflow-hidden">
          {NETWORKS.map(({ chain, id }) => {
            const info = getChainInfo(id);
            const isActive = chainId === id;
            return (
              <button
                key={id}
                onClick={() => {
                  if (!isActive) switchNetwork(chain);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition ${
                  isActive
                    ? "bg-[var(--card)] text-[#D4700A]"
                    : "text-[#5C2D0A] hover:bg-[var(--card)] hover:text-[#5C2D0A]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={info.logo} alt="" className="h-5 w-5 rounded-full" />
                <span>{info.name}</span>
                {isActive && <svg className="ml-auto w-4 h-4 text-[#D4700A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
