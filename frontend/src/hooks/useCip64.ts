"use client";

import { useEffect, useState } from "react";
import { USDC_FEE_ADAPTER } from "@/config";

/**
 * Returns CIP-64 tx overrides for Celo fee abstraction — `feeCurrency` +
 * `type: 'cip64'` — ONLY when the connected wallet is MiniPay or Valora.
 *
 * USDC fee adapter: `0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B`.
 * Passing these overrides lets users pay Celo gas in USDC instead of
 * native CELO. See https://docs.celo.org/build/fee-abstraction (CIP-64).
 *
 * Desktop MetaMask and generic viem wallets don't understand CIP-64, so
 * passing `type: 'cip64'` + `feeCurrency` will cause them to reject the tx.
 * For those wallets we return `{}` and gas is paid in native CELO as usual.
 *
 * Usage:
 * ```ts
 * const cip64 = useCip64();
 * writeContract({ ...call, functionName: 'x', args: [...], ...cip64 });
 * ```
 */
export function useCip64() {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const eth = (window as unknown as { ethereum?: { isMiniPay?: boolean; isValora?: boolean } }).ethereum;
    setSupported(!!(eth?.isMiniPay || eth?.isValora));
  }, []);

  return supported
    ? ({ feeCurrency: USDC_FEE_ADAPTER, type: "cip64" as const } as const)
    : ({} as const);
}
