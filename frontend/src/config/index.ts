/**
 * Wagmi + viem configuration for AgentHands on Celo mainnet (chain ID 42220).
 *
 * Token addresses:
 *   - AgentHands UUPS proxy:  `0xADA0466303441102cb16F8eC1594C744d603f746`
 *   - USDC (6 dec):           `0xcebA9300f2b948710d2653dD7B07f33A8B32118C`
 *   - USDT (6 dec):           `0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e`
 *   - USDm (18 dec):          `0x765DE816845861e75A25fCA122bb6898B8B1282a`
 *   - CELO ERC-20 (18 dec):   `0x471EcE3750Da237f93B8E339c536989b8978a438`
 *   - Chainlink CELO/USD:     `0x0568fD19986748cEfF3301e55c0eb1E729E0Ab7e`
 *   - USDC CIP-64 adapter:    `0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B`
 *
 * Connectors: `injected()` (MiniPay / Valora / MetaMask) + `walletConnect()` (mobile QR).
 * Storage: `cookieStorage` + `ssr: true` for Next.js hydration safety on Celo.
 */
import { http, createConfig, cookieStorage, createStorage } from "wagmi";
import { celo } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "3fcc6b444f69e6b35d2630d06f157140";

/** @since 1.0.0 AgentHands UUPS proxy on Celo mainnet (chainId 42220). */
export const AGENTHANDS_ADDRESS =
  "0xADA0466303441102cb16F8eC1594C744d603f746" as `0x${string}`;

// Stablecoins on Celo mainnet that AgentHands accepts as the reward token.
// USDC + USDT both support EIP-3009 (ride the x402 self-settle path);
// USDm is whitelisted on the contract but only supports EIP-2612 permit
// — the dashboard still surfaces its balance even though it bypasses x402.
/** Celo mainnet USDC (6 decimals) — primary reward token on AgentHands; supports EIP-3009 and CIP-64. */
export const USDC_ADDRESS =
  "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`;
/** Celo mainnet USDT (6 decimals) — whitelisted reward token; supports EIP-3009 and CIP-64. */
export const USDT_ADDRESS =
  "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e" as `0x${string}`;
/** Celo mainnet USDm (18 decimals) — whitelisted reward token; EIP-2612 permit only (no EIP-3009). */
export const USDM_ADDRESS =
  "0x765DE816845861e75A25fCA122bb6898B8B1282a" as `0x${string}`;

/**
 * Union of the three stablecoin symbols supported as task reward tokens on AgentHands.
 * @since 1.0.0
 */
export type StablecoinSymbol = "USDC" | "USDT" | "USDm";

/**
 * Ordered list of whitelisted stablecoins used for multicall balance reads
 * and reward token formatting across the AgentHands frontend.
 * USDC and USDT are 6-decimal; USDm is 18-decimal.
 *
 * Order is stable — index 0 = USDC, 1 = USDT, 2 = USDm — because
 * `useStablecoinBalances` maps the `useReadContracts` result array by
 * position. Changing the order here would silently misalign balances.
 *
 * USDC and USDT support EIP-3009 `transferWithAuthorization`, enabling the
 * x402 self-settle path on Celo without a separate `approve` tx.
 * USDm only supports EIP-2612 `permit` — the x402 path is unavailable for it.
 */
export const STABLECOINS: ReadonlyArray<{
  symbol: StablecoinSymbol;
  address: `0x${string}`;
  decimals: number;
  logo: string | null;
}> = [
  { symbol: "USDC", address: USDC_ADDRESS, decimals: 6, logo: "/usdclogo.png" },
  { symbol: "USDT", address: USDT_ADDRESS, decimals: 6, logo: "/usdtlogo.png" },
  { symbol: "USDm", address: USDM_ADDRESS, decimals: 18, logo: "/usdmlogo.png" },
] as const;

// Native CELO ERC-20 facade. Whitelisted on the contract as a reward token,
// but it's volatile (not $-pegged) and doesn't expose EIP-3009 / EIP-2612,
// so it can't ride x402 — agents have to direct-call createTask. We only
// surface its balance + USD equivalent on desktop; MiniPay/mobile layouts
// stay stablecoin-only because that matches MiniPay's product surface.
export const CELO_TOKEN_ADDRESS =
  "0x471EcE3750Da237f93B8E339c536989b8978a438" as `0x${string}`;
export const CELO_TOKEN_DECIMALS = 18;

// Chainlink CELO/USD price feed on Celo mainnet — used to convert the
// volatile CELO balance into a $ equivalent for the desktop DollarsCard.
// 8-decimal answer; reverts treated as "no price available".
export const CELO_USD_FEED_ADDRESS =
  "0x0568fD19986748cEfF3301e55c0eb1E729E0Ab7e" as `0x${string}`;

// USDC Fee Adapter for CIP-64 fee abstraction — lets users pay gas in USDC
// instead of CELO. See https://docs.celo.org/build/fee-abstraction
export const USDC_FEE_ADAPTER =
  "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B" as `0x${string}`;

/** Active chain for all wagmi and viem calls — Celo mainnet (chain ID 42220). */
export const CHAIN = celo;

/** Celoscan base URL used for "View on Celoscan" external links in the dashboard and header. */
export const EXPLORER_URL =
  CHAIN.blockExplorers?.default?.url ?? "https://celoscan.io";

export const config = createConfig({
  chains: [celo],
  connectors: [
    injected(), // MiniPay & browser wallets
    walletConnect({ projectId }), // mobile via QR
  ],
  transports: {
    [celo.id]: http(),
  },
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
});
