'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAccount } from 'wagmi';
import { Shield, CheckCircle, Loader2, ExternalLink, QrCode } from 'lucide-react';
import dynamic from 'next/dynamic';
import { SelfAppBuilder, getUniversalLink } from '@selfxyz/qrcode';
import type { SelfApp } from '@selfxyz/qrcode';
import { fetchSelfVerified } from '@/lib/utils/verification';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useIsMiniPay } from '@/hooks/useIsMiniPay';

const SelfQR = dynamic(() => import('./SelfQR'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="animate-spin text-[#D4700A]" size={24} />
    </div>
  ),
});

interface SelfVerifyProps {
  onVerified: (userId: string) => void;
}

export default function SelfVerify({ onVerified }: SelfVerifyProps) {
  const { address } = useAccount();
  const [showQR, setShowQR] = useState(false);
  const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [mobileTab, setMobileTab] = useState<'deeplink' | 'qr'>('deeplink');
  const isMobile = useIsMobile();
  const isMiniPay = useIsMiniPay();
  // Use the deep-link path on anything that's likely scanning its own QR
  // would be painful — mobile browsers and embedded MiniPay/Valora dapps.
  const preferDeepLink = isMobile || !!isMiniPay;

  // The universal link is what the Self mobile app intercepts. Tapping it
  // on iOS/Android opens the Self app directly (or App Store fallback).
  const universalLink = useMemo(
    () => (selfApp ? getUniversalLink(selfApp) : null),
    [selfApp]
  );

  // Source of truth is the backend — query on mount and whenever the wallet
  // address changes, with a light poll while the verify dialog is open so we
  // pick up the "verified" flip the moment the Self relayer hits our backend.
  // We also fire onVerified() exactly once on transition, so the parent gets
  // notified even when the deep-link path is used (no SelfQRcodeWrapper
  // onSuccess callback to rely on in that case).
  const notifiedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    if (!address) {
      setVerified(false);
      notifiedRef.current = false;
      return;
    }

    const check = async () => {
      const ok = await fetchSelfVerified(address);
      if (cancelled) return;
      setVerified(ok);
      if (ok && !notifiedRef.current) {
        notifiedRef.current = true;
        onVerified(address);
        setShowQR(false);
      }
    };

    check();
    // Poll continuously while the worker has the verify card open and
    // hasn't finished verifying. Mobile uses always-on tabs (no showQR
    // gate), so we poll regardless of dialog state.
    const id = setInterval(check, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [address, onVerified]);

  useEffect(() => {
    try {
      const app = new SelfAppBuilder({
        appName: 'AgentHands',
        scope: 'agenthands-worker-verify',
        endpoint: `${process.env.NEXT_PUBLIC_API_URL || 'https://agenthands-production.up.railway.app'}/api/self/verify`,
        endpointType: 'staging_https',
        userId: address || '0x0000000000000000000000000000000000000000',
        userIdType: 'hex',
        disclosures: {
          name: true,
          nationality: true,
          date_of_birth: true,
          minimumAge: 18,
        },
      }).build();
      setSelfApp(app);
    } catch (error) {
      console.error('Failed to initialize Self app:', error);
    }
  }, [address]);

  const handleSuccess = useCallback(async () => {
    setShowQR(false);
    // Trust the backend over optimism — re-check rather than flipping state
    // locally (prevents faking by stopping the relayer mid-flow).
    const ok = await fetchSelfVerified(address);
    setVerified(ok);
    if (ok && !notifiedRef.current) {
      notifiedRef.current = true;
      onVerified(address ?? '');
    }
  }, [address, onVerified]);

  if (verified) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-900/10 rounded-lg border border-green-400/30">
        <CheckCircle size={18} className="text-green-600" />
        <div>
          <div className="text-sm font-medium text-green-700">Self Verified Human</div>
          <div className="text-xs text-[#8B4513]">Identity confirmed via Self Protocol</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-[var(--card-solid)] rounded-xl border border-[var(--border)]">
      <h3 className="text-[#5C2D0A] font-semibold mb-2 flex items-center gap-2">
        <Shield size={18} className="text-[#D4700A]" />
        Verify Your Identity
      </h3>
      <p className="text-[#5C2D0A] text-sm mb-4">
        {preferDeepLink
          ? 'Pick a method below to prove you’re a real human. Your personal data stays private — only a zero-knowledge proof is shared.'
          : 'Scan the QR code with the Self app to prove you’re a real human. Your personal data stays private — only a zero-knowledge proof is shared.'}
      </p>

      {preferDeepLink ? (
        // Mobile / MiniPay: tabs are always visible (Open Self / QR Code)
        // — no intermediate "Verify with Self Protocol" button. Polling
        // runs continuously so the card auto-flips when verification lands.
        <div className="flex flex-col gap-3">
          {/* Sliding tabs */}
          <div className="relative flex p-1 bg-[var(--card)] rounded-xl border border-[var(--border)]">
            <span
              aria-hidden
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] bg-[#5C2D0A] rounded-lg transition-transform duration-300 ease-out will-change-transform"
              style={{ transform: mobileTab === 'qr' ? 'translateX(100%)' : 'translateX(0)' }}
            />
            <button
              type="button"
              onClick={() => setMobileTab('deeplink')}
              className={`flex-1 relative z-10 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors duration-300 ${
                mobileTab === 'deeplink' ? 'text-white' : 'text-[#8B4513] hover:text-[#5C2D0A]'
              }`}
            >
              <ExternalLink size={14} /> Open Self
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('qr')}
              className={`flex-1 relative z-10 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors duration-300 ${
                mobileTab === 'qr' ? 'text-white' : 'text-[#8B4513] hover:text-[#5C2D0A]'
              }`}
            >
              <QrCode size={14} /> QR Code
            </button>
          </div>

          {/* Animated panels via grid-rows [0fr ↔ 1fr] trick */}
          <div
            className={`grid transition-all duration-300 ease-out ${
              mobileTab === 'deeplink'
                ? 'grid-rows-[1fr] opacity-100'
                : 'grid-rows-[0fr] opacity-0 pointer-events-none'
            }`}
            aria-hidden={mobileTab !== 'deeplink'}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col items-center gap-3 pt-1">
                {universalLink ? (
                  <a
                    href={universalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 bg-[#5C2D0A] hover:bg-[#3F1D06] text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-sm"
                  >
                    <ExternalLink size={16} />
                    Open Self App
                  </a>
                ) : (
                  <div className="w-full py-3.5 bg-[#8B4513]/40 text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-sm">
                    <Loader2 size={16} className="animate-spin" />
                    Preparing link…
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-[#8B4513]">
                  <Loader2 className="animate-spin text-[#D4700A]" size={14} />
                  <span>Waiting for verification…</span>
                </div>
                <p className="text-xs text-[#8B4513] text-center leading-relaxed">
                  The Self app will walk you through verification. Come back to this
                  tab when you&apos;re done — this card flips to verified automatically.
                </p>
              </div>
            </div>
          </div>

          <div
            className={`grid transition-all duration-300 ease-out ${
              mobileTab === 'qr'
                ? 'grid-rows-[1fr] opacity-100'
                : 'grid-rows-[0fr] opacity-0 pointer-events-none'
            }`}
            aria-hidden={mobileTab !== 'qr'}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col items-center gap-3 pt-1">
                <div className="bg-white p-4 rounded-xl border border-[var(--border)]">
                  {selfApp ? (
                    <SelfQR
                      selfApp={selfApp}
                      onSuccess={handleSuccess}
                      darkMode={false}
                    />
                  ) : (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="animate-spin text-[#D4700A]" size={24} />
                    </div>
                  )}
                </div>
                <p className="text-xs text-[#8B4513] text-center leading-relaxed">
                  Scan with the Self app on another device.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : showQR ? (
        // Desktop expanded: QR
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-xl border border-[var(--border)]">
            {selfApp ? (
              <SelfQR
                selfApp={selfApp}
                onSuccess={handleSuccess}
                darkMode={false}
              />
            ) : (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="animate-spin text-[#D4700A]" size={24} />
              </div>
            )}
          </div>
          <button
            onClick={() => setShowQR(false)}
            className="text-sm text-[#8B4513] hover:text-[#5C2D0A] underline"
          >
            Cancel
          </button>
        </div>
      ) : (
        // Desktop collapsed: button → QR
        <button
          onClick={() => setShowQR(true)}
          className="w-full py-3 bg-[#5C2D0A] hover:bg-[#6B3A1F] text-white font-semibold rounded-lg transition flex items-center justify-center gap-2 text-sm"
        >
          <Shield size={16} />
          Verify with Self Protocol
        </button>
      )}

      <p className="text-xs text-[#8B4513] mt-3 text-center">
        Powered by{' '}
        <a href="https://self.xyz" target="_blank" rel="noopener noreferrer" className="text-[#D4700A] hover:underline">
          Self Protocol
        </a>
        {' '}— zero-knowledge identity verification
      </p>
    </div>
  );
}
