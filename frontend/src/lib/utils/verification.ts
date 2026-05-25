/**
 * @module verification — Self Protocol ZK-proof status helpers for Celo AgentHands.
 *
 * Client-side helper for checking Self Protocol verification status against
 * the backend (not localStorage). The backend is the source of truth — the
 * frontend only caches the last known status in React state.
 */

/** Backend base URL — Railway production by default; overridden by `NEXT_PUBLIC_API_URL` in `.env.local`. */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://agenthands-production.up.railway.app";

/**
 * Query the AgentHands backend for Self Protocol verification status for a given Celo address.
 *
 * Returns `false` on any network error or non-200 response so callers always get a boolean.
 * The backend endpoint (`/api/self/verified/:address`) is the authoritative source of truth —
 * the Self Protocol ZK-proof relayer writes to it after on-chain attestation succeeds.
 *
 * Cache is disabled (`no-store`) so every call reflects the latest relay state — important
 * because verification can succeed async after the user completes the Self QR scan on Celo.
 *
 * @since 1.0.0
 * @param address - Celo wallet address to check; returns false immediately if undefined.
 * @returns `true` if the address has a valid Self Protocol ZK attestation; `false` otherwise.
 */
export async function fetchSelfVerified(address: string | undefined): Promise<boolean> {
  if (!address) return false;
  try {
    const res = await fetch(`${API_BASE}/api/self/verified/${address}`, { cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as { verified?: boolean };
    return !!data.verified;
  } catch {
    return false;
  }
}
