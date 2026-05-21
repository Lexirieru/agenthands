'use client';

/** Self Protocol QR code component — renders a ZK identity verification QR for Celo MiniPay users. */
import { SelfQRcodeWrapper } from '@selfxyz/qrcode';

/**
 * Thin client-side wrapper around `SelfQRcodeWrapper` from `@selfxyz/qrcode`.
 *
 * Exists as a separate file so it can be dynamically imported (`next/dynamic`,
 * `ssr: false`) in `SelfVerify` — the underlying library uses browser-only APIs
 * that crash during Next.js SSR if imported at the module level.
 *
 * @since 1.0.0
 * @see SelfVerify — consumer that dynamic-imports this component for Celo ZK identity
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function SelfQR(props: any) {
  return <SelfQRcodeWrapper {...props} />;
}
