"use client";

import { useEffect, useState } from "react";
import { useConnect, useConnectors } from "wagmi";

/**
 * Auto-connect to the injected wallet on page load — required for MiniPay
 * and Valora, which both inject `window.ethereum` but do NOT trigger
 * wagmi's default auto-connect unless explicitly prompted.
 *
 * MiniPay injects `window.ethereum` with `isMiniPay: true` and Valora with
 * `isValora: true`. Both wallets expect the dapp to call `eth_requestAccounts`
 * (or the wagmi `connect()` equivalent) on mount — showing a separate
 * "Connect Wallet" button would violate MiniPay's UX guidelines and confuse
 * users because the wallet is already open and active.
 *
 * `hasAttempted` prevents double-calls on re-renders. On SSR or in desktop
 * browsers without an injected provider the hook is a silent no-op.
 *
 * Consumed by `AppBoot` (context/index.tsx) so it runs once the Wagmi
 * provider is in scope.
 *
 * @since 1.0.0
 */
export function useAutoConnect() {
  const connectors = useConnectors();
  const { connect, error, isPending } = useConnect();
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    if (hasAttempted) return;

    const injected = connectors.find((c) => c.id === "injected");
    if (injected) {
      setHasAttempted(true);
      connect({ connector: injected });
    }
  }, [connectors, connect, hasAttempted]);

  /** @returns `error` from wagmi connect, `isConnecting` pending flag, and `hasAttempted` guard. */
  return { error, isConnecting: isPending, hasAttempted };
}
