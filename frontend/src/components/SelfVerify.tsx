'use client';

import { useState, useCallback } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { Shield, CheckCircle, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

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
  const { address } = useAppKitAccount();
  const [showQR, setShowQR] = useState(false);

  const initialVerified = typeof window !== 'undefined' && address
    ? !!localStorage.getItem(`self_verified_${address}`)
    : false;

  const [verified, setVerified] = useState(initialVerified);

  const handleSuccess = useCallback(() => {
    setVerified(true);
    setShowQR(false);
    const userId = `self-verified-${Date.now()}`;
    localStorage.setItem(`self_verified_${address}`, userId);
    onVerified(userId);
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
            <SelfQR
              selfApp={{
                appName: 'AgentHands',
                scope: 'agenthands-worker-verify',
                endpoint: `${process.env.NEXT_PUBLIC_API_URL || 'https://agenthands-production.up.railway.app'}/api/self/verify`,
                logoBase64: '',
                userId: address || '0x0000000000000000000000000000000000000000',
                userIdType: 'hex',
                devMode: true,
                disclosures: {
                  name: true,
                  nationality: true,
                  date_of_birth: true,
                  minimumAge: 18,
                },
              }}
              onSuccess={handleSuccess}
              darkMode={false}
            />
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
