/**
 * Client-side helper for checking Self Protocol verification status against
 * the backend (not localStorage). The backend is the source of truth — the
 * frontend only caches the last known status in React state.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://agenthands-production.up.railway.app";

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
