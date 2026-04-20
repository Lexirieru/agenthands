"use client";

import { useEffect, useState } from "react";
import { USDC_FEE_ADAPTER } from "@/config";

/**
 * Returns CIP-64 tx overrides (feeCurrency + tx type) ONLY when the connected
 * wallet advertises MiniPay/Valora — i.e. a Celo-native wallet that holds
 * stablecoins and expects to pay gas in them.
 *
 * Desktop MetaMask (and most generic viem wallets) don't understand CIP-64,
 * so passing `type: 'cip64'` + `feeCurrency` will make them reject the tx.
 * For those wallets we return an empty object and the wallet pays gas in
 * native CELO as usual.
 *
 * Usage:
 *   const cip64 = useCip64();
 *   writeContract({ ...call, functionName: 'x', args: [...], ...cip64 });
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
