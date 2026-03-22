"use client";

import { useState, useMemo } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { SelfQRcodeWrapper, SelfAppBuilder } from "@selfxyz/qrcode";
import { v4 as uuidv4 } from "uuid";

interface SelfVerifyProps {
  onVerified: (userId: string) => void;
}

export default function SelfVerify({ onVerified }: SelfVerifyProps) {
  const { address } = useAppKitAccount();

  // Initialize from localStorage synchronously
  const initialVerified = typeof window !== "undefined"
    ? !!localStorage.getItem(`self_verified_${address}`)
    : false;

  const [verified, setVerified] = useState(initialVerified);

  const userId = useMemo(() => uuidv4(), []);

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

  const selfApp = new SelfAppBuilder({
    appName: "AgentHands",
    scope: "agenthands-worker-verify",
    endpoint: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/self/verify`,
    userId,
    disclosures: {
      minimumAge: 18,
      excludedCountries: ["IRN", "PRK"],
    },
  }).build();

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          🛡️ Verify Your Identity
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Scan with the Self app to prove you&apos;re a real human. Your personal data stays private — only a zero-knowledge proof is shared.
        </p>

        <div className="flex justify-center bg-white rounded-lg p-4">
          <SelfQRcodeWrapper
            selfApp={selfApp}
            onSuccess={() => {
              setVerified(true);
              localStorage.setItem(`self_verified_${address}`, userId);
              onVerified(userId);
            }}
            onError={(error) => {
              console.error("Self verification error:", error);
            }}
            darkMode={false}
            size={250}
          />
        </div>

        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            Don&apos;t have Self app?{" "}
            <a
              href="https://self.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline"
            >
              Download here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
