import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { defineChain } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";

export const projectId =
  process.env.NEXT_PUBLIC_PROJECT_ID || "b56e18d47c72ab683b10814fe9495694";

// Custom network definitions
export const baseSepolia = defineChain({
  id: 84532,
  caipNetworkId: "eip155:84532",
  chainNamespace: "eip155",
  name: "Base Sepolia",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia.base.org"] },
  },
  blockExplorers: {
    default: { name: "BaseScan", url: "https://sepolia.basescan.org" },
  },
  testnet: true,
});

export const celoSepolia = defineChain({
  id: 11142220,
  caipNetworkId: "eip155:11142220",
  chainNamespace: "eip155",
  name: "Celo Sepolia Testnet",
  nativeCurrency: { name: "S-CELO", symbol: "S-CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://forno.celo-sepolia.celo-testnet.org"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://celo-sepolia.blockscout.com" },
  },
  testnet: true,
});

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  baseSepolia,
  celoSepolia,
];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

export const metadata = {
  name: "AgentHands",
  description: "Hands for your agent — hire humans for physical-world tasks",
  url: "https://agenthands.xyz",
  icons: ["https://agenthands.xyz/icon.png"],
};

// Contract addresses (same on both chains — deterministic deploy)
export const AGENTHANDS_ADDRESS =
  "0xADA0466303441102cb16F8eC1594C744d603f746" as `0x${string}`;

// USDC addresses per chain (from Circle faucet)
export const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",    // Base Sepolia
  11142220: "0x01C5C0122039549AD1493B8220cABEdD739BC44E", // Celo Sepolia
};
