'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Shield, CheckCircle, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { SelfAppBuilder } from '@selfxyz/qrcode';
import type { SelfApp } from '@selfxyz/qrcode';
import { fetchSelfVerified } from '@/lib/utils/verification';

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

  // Source of truth is the backend — query on mount and whenever the wallet
  // address changes, with a light poll while the QR dialog is open so we
  // pick up the "verified" flip the moment the Self relayer hits our backend.
  useEffect(() => {
    let cancelled = false;
    if (!address) {
      setVerified(false);
      return;
    }

    const check = async () => {
      const ok = await fetchSelfVerified(address);
      if (!cancelled) setVerified(ok);
    };

    check();
    const id = showQR ? setInterval(check, 3000) : null;
    return () => {
      cancelled = true;
      if (id) clearInterval(id);
    };
  }, [address, showQR]);

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
    if (ok) onVerified(address ?? '');
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
        Scan the QR code with the Self app to prove you&apos;re a real human. Your personal data stays private — only a zero-knowledge proof is shared.
      </p>

      {showQR ? (
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
