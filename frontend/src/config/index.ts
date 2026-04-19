import { http, createConfig, cookieStorage, createStorage } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

// Get Project ID from environment - default for fallback
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "3fcc6b444f69e6b35d2630d06f157140";

// Contract address (deployed on Celo Sepolia)
export const AGENTHANDS_ADDRESS =
  "0xADA0466303441102cb16F8eC1594C744d603f746" as `0x${string}`;

// USDC on Celo Sepolia
export const USDC_ADDRESS =
  "0x01C5C0122039549AD1493B8220cABEdD739BC44E" as `0x${string}`;

// USDC Fee Adapter (for feeCurrency — 6 decimal tokens need adapter for gas pricing)
// Celo Sepolia: https://docs.celo.org/build/fee-abstraction
export const USDC_FEE_ADAPTER =
  "0x4822e58de6f5e485eF90df51C41CE01721331dC0" as `0x${string}`;

// ── Mainnet addresses (uncomment after deploy) ──
// USDC Mainnet: 0xcebA9300f2b948710d2653dD7B07f33A8B32118C
// USDC Adapter Mainnet: 0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B


// Active chain setup - Default to Sepolia for dev, easily switchable to celo
export const CHAIN = celoSepolia;

// // Export contract addresses here if needed globally
// export const AGENTHANDS_ADDRESS = "0x4D13d54Ca71164873F6423CfC8cE02379F864cdC";
// export const USDC_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a"; // Celo Sepolia USDC

export const config = createConfig({
  chains: [celo, celoSepolia],
  connectors: [
    injected(), // Support MiniPay & other browser wallets
    walletConnect({ projectId }), // Support mobile wallets via QR
  ],
  transports: {
    [celo.id]: http(),
    [celoSepolia.id]: http("https://forno.celo-sepolia.celo-testnet.org"),
  },
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
});
