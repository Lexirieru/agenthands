import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { baseSepolia, celoAlfajores } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";

export const projectId =
  process.env.NEXT_PUBLIC_PROJECT_ID || "b56e18d47c72ab683b10814fe9495694"; // localhost testing only

// Custom Celo Sepolia network (if not available in appkit)
export const celoSepolia = {
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://forno.celo-sepolia.celo-testnet.org"] },
  },
  blockExplorers: {
    default: {
      name: "Celo Sepolia Explorer",
      url: "https://celo-sepolia.blockscout.com",
    },
  },
  testnet: true,
} as const;

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  baseSepolia,
  celoAlfajores,
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

// USDC addresses per chain
export const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia
  44787: "0x01C5C0122039549AD1493B8220cABEdD739BC44E", // Celo Alfajores/Sepolia
};
