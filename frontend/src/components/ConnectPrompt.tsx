"use client";

import { Wallet, Loader2 } from "lucide-react";
import { useConnect } from "wagmi";
import { useIsMiniPay } from "@/hooks/useIsMiniPay";

/**
 * Props for `ConnectPrompt`.
 * @since 1.0.0
 * Both fields have sensible defaults and are optional.
 */
interface Props {
  /** Heading shown above the connect button (default: `"Connect Wallet"`). */
  title?: string;
  /** Secondary line below the heading. */
  subtitle?: string;
}

/**
 * Connect-wallet CTA card, tuned for both desktop browsers and MiniPay.
 *
 * MiniPay auto-connects on load (and the docs tell us not to ship a Connect
 * button), so when we detect it we render a subtle "Connecting…" indicator
 * instead and lean on `useAutoConnect` to finish the job.
 *
 * @since 1.0.0
 * @see useAutoConnect — handles injected wallet connection for Celo MiniPay
 */
export default function ConnectPrompt({
  title = "Connect Wallet",
  subtitle = "Connect to continue",
}: Props) {
  const { connect, connectors } = useConnect();
  const isMiniPay = useIsMiniPay();

  const handleConnect = () => {
    // Prefer the injected connector (MiniPay / MetaMask) so Celo wallet state is reused;
    // fall back to the first available connector for generic desktop browsers.
    const connector = connectors.find((c) => c.id === "injected") || connectors[0];
    if (connector) connect({ connector });
  };

  return (
    <div className="flex flex-col items-center py-16 bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl p-8">
      <div className="w-20 h-20 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center mb-4">
        <Wallet size={32} className="text-[#8B4513]" />
      </div>
      <h2 className="text-lg font-semibold text-[#5C2D0A] mb-2">{title}</h2>
      <p className="text-sm text-[#8B4513] mb-6 text-center">{subtitle}</p>

      {isMiniPay ? (
        <span className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--card)] text-[#8B4513] border border-[var(--border)] rounded-xl text-sm font-medium min-h-[48px]">
          <Loader2 size={16} className="animate-spin" />
          Connecting MiniPay…
        </span>
      ) : (
        <button
          onClick={handleConnect}
          className="flex items-center gap-2 px-8 py-3 bg-[#5C2D0A] text-white font-semibold rounded-xl text-sm active:scale-[0.98] transition-transform min-h-[48px]"
        >
          <Wallet size={16} />
          Connect Wallet
        </button>
      )}
    </div>
  );
}
