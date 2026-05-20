"use client";

import { useEffect, useState } from "react";

/**
 * Detect whether the app is running inside MiniPay or Valora — Celo-native
 * wallets that auto-connect and that MiniPay's official docs explicitly
 * instruct us NOT to show a "Connect Wallet" button for.
 *
 * Detection logic: reads `window.ethereum.isMiniPay` and
 * `window.ethereum.isValora`. Both flags are set by the respective wallet's
 * injected provider before the page script runs, so the check is synchronous
 * inside the `useEffect`. A single hook covers both wallets because their
 * UX requirements are identical in the AgentHands frontend (no connect button,
 * CIP-64 fee abstraction enabled, stablecoin-only balance display).
 *
 * Returns `null` on the first (SSR) render to avoid a hydration mismatch
 * between the server HTML (no window) and the client. After the effect runs
 * on mount the value is a stable boolean that will not change for the
 * lifetime of the page.
 *
 * Used by `Header`, `DollarsCard`, `SelfVerify`, and `useCip64` to adjust
 * UI and transaction behaviour for Celo mobile wallets.
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
