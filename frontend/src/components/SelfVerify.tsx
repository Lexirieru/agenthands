'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAccount } from 'wagmi';
import { Shield, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
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
    const id = showQR ? setInterval(check, 3000) : null;
    return () => {
      cancelled = true;
      if (id) clearInterval(id);
    };
  }, [address, showQR, onVerified]);

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
          ? 'Tap the button below to open the Self app and prove you’re a real human. Your personal data stays private — only a zero-knowledge proof is shared.'
          : 'Scan the QR code with the Self app to prove you’re a real human. Your personal data stays private — only a zero-knowledge proof is shared.'}
      </p>

      {showQR ? (
        <div className="flex flex-col items-center gap-4">
          {preferDeepLink && universalLink ? (
            <>
              <a
                href={universalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 bg-[#5C2D0A] hover:bg-[#3F1D06] text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-sm"
              >
                <ExternalLink size={16} />
                Open Self App
              </a>
              <div className="flex items-center gap-2 text-xs text-[#8B4513]">
                <Loader2 className="animate-spin text-[#D4700A]" size={14} />
                <span>Waiting for verification…</span>
              </div>
              <p className="text-xs text-[#8B4513] text-center leading-relaxed">
                The Self app will walk you through verification. Come back to this tab when
                you&apos;re done — this card will flip to verified automatically.
              </p>
            </>
          ) : (
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
          )}
          <button
            onClick={() => setShowQR(false)}
            className="text-sm text-[#8B4513] hover:text-[#5C2D0A] underline"
          >
            Cancel
          </button>
        </div>
      ) : preferDeepLink && universalLink ? (
        // On mobile / MiniPay we skip the intermediate "Show QR" step and let
        // the user tap straight through to the Self app. We still flip
        // showQR=true so the polling effect picks up the verification result.
        <a
          href={universalLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setShowQR(true)}
          className="w-full py-3 bg-[#5C2D0A] hover:bg-[#6B3A1F] text-white font-semibold rounded-lg transition flex items-center justify-center gap-2 text-sm"
        >
          <Shield size={16} />
          Verify with Self Protocol
        </a>
      ) : (
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
