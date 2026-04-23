"use client";

import { useEffect, useState } from "react";

/**
 * Detects whether the app is running inside MiniPay (or Valora) — wallets
 * that auto-connect and that MiniPay's docs explicitly tell us NOT to show
 * a "Connect Wallet" button for.
 *
 * Returns `null` on first render to avoid SSR/hydration flicker; once the
 * client code runs we flip to a real boolean.
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
