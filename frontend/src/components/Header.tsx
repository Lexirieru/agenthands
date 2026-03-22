'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { Menu, X, Wallet, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useDisconnect } from 'wagmi';
import { USDC_ADDRESSES } from '@/config';
import { truncateAddress } from '@/lib/utils/format';
import NetworkSwitch from './NetworkSwitch';

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const navLinks = [
  { href: '/tasks', label: 'TASKS' },
  { href: '/dashboard', label: 'DASHBOARD' },
];

export default function Header() {
  const pathname = usePathname();
  const { open } = useAppKit();
  const { isConnected, address } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { disconnect } = useDisconnect();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);

  const usdcAddress = chainId ? USDC_ADDRESSES[chainId as number] : undefined;

  const { data: rawBalance } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address && !!usdcAddress },
  });

  const usdcFormatted = rawBalance !== undefined
    ? parseFloat(formatUnits(rawBalance, 6)).toFixed(2)
    : null;

  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-50 px-4 sm:px-6 lg:px-8 pt-3 pb-2">
      <div className="mx-auto max-w-7xl relative">
        {/* Glow effects on edges */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-24 h-12 bg-[#FF8C42]/25 blur-2xl rounded-full pointer-events-none" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-24 h-12 bg-[#FF8C42]/25 blur-2xl rounded-full pointer-events-none" />

        {/* Main pill container */}
        <nav className="relative flex items-center justify-between bg-[#FFFAF5]/80 backdrop-blur-md border border-[#F5DEC8] rounded-full px-3 py-2 sm:px-5">

          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🤝</span>
            <span className="text-lg font-bold text-[#1A0F08] tracking-tight">AgentHands</span>
          </Link>

          {/* Right: nav links + wallet CTA */}
          <div className="hidden md:flex items-center gap-1">
            <div className="flex items-center border border-[#F5DEC8] rounded-full overflow-hidden mr-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-1.5 text-xs font-medium tracking-wider transition-colors font-label ${
                    isActive(link.href)
                      ? 'text-[#1A0F08] bg-[#FFF2E8]'
                      : 'text-[#6B5040] hover:text-[#1A0F08] hover:bg-[#FFFAF5]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* USDC Balance */}
            {isConnected && usdcFormatted && (
              <span className="text-xs bg-[#FFF2E8] text-[#D4700A] px-3 py-1.5 rounded-full border border-[#F5DEC8] font-label mr-1 inline-flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://cdn.morpho.org/assets/logos/usdc.svg" alt="USDC" className="h-4 w-4" />
                ${usdcFormatted}
              </span>
            )}

            {/* Network Switch — only when connected */}
            {isConnected && <NetworkSwitch />}

            {/* Wallet Connect */}
            <div className="ml-1 relative">
              {isConnected && address ? (
                <div className="relative">
                  <button
                    onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A0F08] text-[#FFFAF5] border border-[#1A0F08] hover:border-[#FF8C42] rounded-full transition text-xs font-label"
                  >
                    <Wallet size={14} />
                    {truncateAddress(address)}
                  </button>
                  {walletMenuOpen && (
                    <div className="absolute right-0 mt-2 w-44 bg-white border border-[#F5DEC8] rounded-xl shadow-lg z-50 overflow-hidden">
                      <button
                        onClick={() => { open(); setWalletMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[#6B5040] hover:bg-[#FFFAF5] hover:text-[#1A0F08] transition"
                      >
                        <Wallet size={14} /> Account
                      </button>
                      <button
                        onClick={() => { disconnect(); setWalletMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition border-t border-[#F5DEC8]"
                      >
                        <LogOut size={14} /> Disconnect
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => open()}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1A0F08] text-[#FFFAF5] border border-[#1A0F08] hover:border-[#FF8C42] hover:shadow-[0_0_16px_4px_rgba(255,140,66,0.3)] rounded-full transition text-xs font-label"
                >
                  <Wallet size={14} />
                  Connect Wallet
                </button>
              )}
            </div>
          </div>

          {/* Mobile: menu toggle */}
          <div className="md:hidden flex items-center ml-auto">
            <button
              className="text-[#6B5040] hover:text-[#1A0F08] p-1"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden mt-2 bg-white border border-[#F5DEC8] rounded-2xl px-4 py-3 shadow-lg">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-medium tracking-wider transition-colors ${
                    isActive(link.href)
                      ? 'text-[#1A0F08] bg-[#FFF2E8]'
                      : 'text-[#6B5040] hover:text-[#1A0F08] hover:bg-[#FFFAF5]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile wallet */}
              <div className="mt-2 pt-2 border-t border-[#F5DEC8] flex flex-col gap-2">
                {isConnected && usdcFormatted && (
                  <span className="text-xs text-[#D4700A] px-4 py-1 font-label inline-flex items-center gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://cdn.morpho.org/assets/logos/usdc.svg" alt="USDC" className="h-4 w-4" />
                    ${usdcFormatted}
                  </span>
                )}
                {isConnected && (
                  <div className="px-4 py-1">
                    <NetworkSwitch />
                  </div>
                )}
                <div className="px-4 py-1">
                  {isConnected && address ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#1A0F08] font-label">{truncateAddress(address)}</span>
                      <button onClick={() => { disconnect(); setMobileOpen(false); }} className="text-xs text-red-500 hover:text-red-700">
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { open(); setMobileOpen(false); }}
                      className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1A0F08] text-[#FFFAF5] rounded-xl text-xs font-label"
                    >
                      <Wallet size={14} /> Connect Wallet
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
