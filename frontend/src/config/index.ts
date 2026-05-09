import { http, createConfig, cookieStorage, createStorage } from "wagmi";
import { celo } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "3fcc6b444f69e6b35d2630d06f157140";

// AgentHands UUPS proxy on Celo mainnet
export const AGENTHANDS_ADDRESS =
  "0xADA0466303441102cb16F8eC1594C744d603f746" as `0x${string}`;

// USDC on Celo mainnet
export const USDC_ADDRESS =
  "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`;

// USDC Fee Adapter for CIP-64 fee abstraction — lets users pay gas in USDC
// instead of CELO. See https://docs.celo.org/build/fee-abstraction
export const USDC_FEE_ADAPTER =
  "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B" as `0x${string}`;

// Active chain — Celo mainnet
export const CHAIN = celo;

// Block explorer base URL — used for "View on Celoscan" links.
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
