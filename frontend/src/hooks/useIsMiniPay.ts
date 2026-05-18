"use client";

import { useEffect, useState } from "react";

/**
 * Detect whether the app is running inside MiniPay or Valora — Celo-native
 * wallets that auto-connect and that MiniPay's official docs explicitly
 * instruct us NOT to show a "Connect Wallet" button for.
 *
 * Both wallets inject `window.ethereum` with `isMiniPay: true` or
 * `isValora: true`. We check both flags so the same hook covers the two
 * most common Celo mobile wallet surfaces.
 *
 * Returns `null` on first render (SSR) to prevent hydration mismatches;
 * flips to a real boolean once the client-side effect runs.
 *
 * Used by `Header`, `SwipeStack`, and `useAutoConnect` to skip the manual
 * connect button on Celo's mobile-first wallet experience.
 */
export function useIsMiniPay(): boolean | null {
  const [isMiniPay, setIsMiniPay] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const eth = (window as unknown as {
      ethereum?: { isMiniPay?: boolean; isValora?: boolean };
    }).ethereum;
    setIsMiniPay(!!(eth?.isMiniPay || eth?.isValora));
  }, []);

  return isMiniPay;
}
