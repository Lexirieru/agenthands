import { http, createConfig, cookieStorage, createStorage } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

// Get Project ID from environment - default for fallback
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "3fcc6b444f69e6b35d2630d06f157140";

// Contract address (fresh native-only deploy on Celo Sepolia)
export const AGENTHANDS_ADDRESS =
  "0x10D9EB91D0a69098431fB833e666Bd64455D45f3" as `0x${string}`;

// Active chain setup — Celo Sepolia for testing, switch to `celo` for mainnet.
export const CHAIN = celoSepolia;

export const config = createConfig({
  chains: [celo, celoSepolia],
  connectors: [
    injected(), // MiniPay & other browser wallets
    walletConnect({ projectId }), // Mobile wallets via QR
  ],
  transports: {
    [celo.id]: http(),
    [celoSepolia.id]: http("https://forno.celo-sepolia.celo-testnet.org"),
  },
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
});
