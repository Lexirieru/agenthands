"use client";

import { useEffect, useState } from "react";
import { useConnect, useConnectors } from "wagmi";

/**
 * MiniPay requires automatic wallet connection on page load.
 * This hook connects to the injected provider (window.ethereum) immediately.
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
