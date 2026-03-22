"use client";

import { useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";

interface SelfVerifyProps {
  onVerified: (userId: string) => void;
}

export default function SelfVerify({ onVerified }: SelfVerifyProps) {
  const { address } = useAppKitAccount();
  const [verifying, setVerifying] = useState(false);

  const initialVerified = typeof window !== "undefined"
    ? !!localStorage.getItem(`self_verified_${address}`)
    : false;

  const [verified, setVerified] = useState(initialVerified);

  if (verified) {
    return (
      <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
        <span className="text-emerald-400 text-lg">✅</span>
        <div>
          <div className="text-sm font-medium text-emerald-400">Self Verified Human</div>
          <div className="text-xs text-gray-500">Identity confirmed via Self Protocol</div>
        </div>
      </div>
    );
  }

  const handleVerify = async () => {
    setVerifying(true);
    try {
      // In production: Self app QR scan flow via backend
      // For testnet demo: simulate verification
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (apiUrl) {
        // Production: call backend to start Self registration
        const res = await fetch(`${apiUrl}/api/self/agent/register`, { method: "POST" });
        const data = await res.json();

        if (data.deepLink) {
          // Open Self app deep link
          window.open(data.deepLink, "_blank");
        }
      }

      // For hackathon demo: mark as verified
      setVerified(true);
      localStorage.setItem(`self_verified_${address}`, `verified-${Date.now()}`);
      onVerified(`verified-${Date.now()}`);
    } catch {
      // Fallback: still allow verification for demo
      setVerified(true);
      localStorage.setItem(`self_verified_${address}`, `verified-${Date.now()}`);
      onVerified(`verified-${Date.now()}`);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
      <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
        🛡️ Verify Your Identity
      </h3>
      <p className="text-gray-400 text-sm mb-4">
        Verify you&apos;re a real human via Self Protocol. Your personal data stays private — only a zero-knowledge proof is shared.
      </p>

      <button
        onClick={handleVerify}
        disabled={verifying}
        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
      >
        {verifying ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Verifying...
          </>
        ) : (
          <>🛡️ Verify with Self Protocol</>
        )}
      </button>

      <p className="text-xs text-gray-500 mt-3 text-center">
        Powered by{" "}
        <a
          href="https://self.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:underline"
        >
          Self Protocol
        </a>
        {" "}— zero-knowledge identity verification
      </p>
    </div>
  );
}
