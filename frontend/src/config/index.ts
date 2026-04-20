import { http, createConfig, cookieStorage, createStorage } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "3fcc6b444f69e6b35d2630d06f157140";

// Fresh USDC-only deploy on Celo Sepolia (UUPS proxy)
export const AGENTHANDS_ADDRESS =
  "0x1d7939E37e08802A6B86204f8E3C52bA4a6cBfba" as `0x${string}`;

// USDC on Celo Sepolia
export const USDC_ADDRESS =
  "0x01C5C0122039549AD1493B8220cABEdD739BC44E" as `0x${string}`;

// USDC Fee Adapter for CIP-64 fee abstraction — lets users pay gas in USDC
// instead of CELO. See https://docs.celo.org/build/fee-abstraction
export const USDC_FEE_ADAPTER =
  "0x4822e58de6f5e485eF90df51C41CE01721331dC0" as `0x${string}`;

// Active chain — Celo Sepolia for testing, switch to `celo` for mainnet.
export const CHAIN = celoSepolia;

// Block explorer base URL for the active chain (used for "View on CeloScan" links).
export const EXPLORER_URL =
  CHAIN.blockExplorers?.default?.url ??
  (CHAIN.id === 11142220
    ? "https://celo-sepolia.blockscout.com"
    : "https://celo.blockscout.com");

export const config = createConfig({
  chains: [celo, celoSepolia],
  connectors: [
    injected(), // MiniPay & browser wallets
    walletConnect({ projectId }), // mobile via QR
  ],
  transports: {
    [celo.id]: http(),
    [celoSepolia.id]: http("https://forno.celo-sepolia.celo-testnet.org"),
  },
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
});
