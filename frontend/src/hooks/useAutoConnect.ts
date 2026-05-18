"use client";

import { useEffect, useState } from "react";
import { useConnect, useConnectors } from "wagmi";

/**
 * Auto-connect to the injected wallet on page load — required for MiniPay
 * and Valora, which both inject `window.ethereum` but do NOT trigger
 * wagmi's default auto-connect unless explicitly prompted.
 *
 * MiniPay's UX spec prohibits showing a manual "Connect Wallet" button,
 * so this hook fires once on mount, finds the `injected` connector, and
 * calls `connect()` immediately. `hasAttempted` prevents double-calls on
 * re-renders. If no injected provider is present (SSR / desktop without
 * extension) the hook is a no-op.
 *
 * Consumed by `ResponsiveShell` on the Celo mobile layout only.
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

  return { error, isConnecting: isPending, hasAttempted };
}
