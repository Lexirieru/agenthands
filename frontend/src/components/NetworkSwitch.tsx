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
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/50 rounded-full transition text-sm"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={currentChain.logo} alt="" className="h-4 w-4 rounded-full" />
        <span className="text-gray-300 text-xs">{currentChain.name}</span>
        <svg className={`w-3 h-3 text-gray-500 transition ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
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
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={info.logo} alt="" className="h-5 w-5 rounded-full" />
                <span>{info.name}</span>
                {isActive && <span className="ml-auto text-emerald-400">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
