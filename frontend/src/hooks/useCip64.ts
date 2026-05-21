"use client";

import { useEffect, useState } from "react";
/** @see {@link /config} USDC_FEE_ADAPTER — `0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B` on Celo mainnet */
import { USDC_FEE_ADAPTER } from "@/config";

/**
 * Returns CIP-64 tx overrides for Celo fee abstraction — `feeCurrency` +
 * `type: 'cip64'` — ONLY when the connected wallet is MiniPay or Valora.
 *
 * CIP-64 is a Celo-specific transaction type (EIP-1559 extension) that adds
 * a `feeCurrency` field. When this field is set to the USDC Fee Adapter
 * (`0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B`), the Celo gas market
 * deducts the gas cost in USDC rather than native CELO. This allows workers
 * to interact with AgentHands without holding any CELO — only the USDC
 * reward they earn needs to be in their wallet.
 *
 * Desktop MetaMask, Rainbow, and generic viem/wagmi wallets do not implement CIP-64;
 * sending `type: 'cip64'` to them causes the tx to be rejected. The hook
 * gates the overrides on `isMiniPay || isValora` detection (same check as
 * `useIsMiniPay`) and returns an empty object `{}` for non-CIP-64 wallets,
 * so gas is paid in native CELO as the standard EIP-1559 fallback.
 *
 * Usage:
 * ```ts
 * const cip64 = useCip64();
 * writeContract({ ...call, functionName: 'x', args: [...], ...cip64 });
 * ```
 *
 * @since 1.0.0
 * @returns CIP-64 `feeCurrency` + `type` overrides, or empty object for non-CIP-64 wallets.
 */
export function useCip64() {
  /** True when the injected provider exposes `isMiniPay` or `isValora` on Celo. */
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const eth = (window as unknown as { ethereum?: { isMiniPay?: boolean; isValora?: boolean } }).ethereum;
    setSupported(!!(eth?.isMiniPay || eth?.isValora));
  }, []);

  /** Spread this object directly into `writeContract` args to add CIP-64 fee fields on Celo. */
  return supported
    ? ({ feeCurrency: USDC_FEE_ADAPTER, type: "cip64" as const } as const)
    : ({} as const);
}
