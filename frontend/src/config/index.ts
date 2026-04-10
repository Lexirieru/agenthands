import { http, createConfig, cookieStorage, createStorage } from "wagmi";
import { type Chain } from "viem";
import { injected } from "wagmi/connectors";

// Celo Sepolia for development — switch to celo mainnet after contract deploy
export const celoSepolia: Chain = {
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://alfajores-forno.celo-testnet.org"] },
  },
  blockExplorers: {
    default: { name: "CeloScan", url: "https://alfajores.celoscan.io" },
  },
  testnet: true,
};

export const CHAIN = celoSepolia;

export const config = createConfig({
  chains: [celoSepolia],
  connectors: [injected()],
  transports: {
    [celoSepolia.id]: http("https://alfajores-forno.celo-testnet.org"),
  },
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
});

// Contract address (deployed on Celo Sepolia)
export const AGENTHANDS_ADDRESS =
  "0xADA0466303441102cb16F8eC1594C744d603f746" as `0x${string}`;

// USDC on Celo Sepolia
export const USDC_ADDRESS =
  "0x01C5C0122039549AD1493B8220cABEdD739BC44E" as `0x${string}`;

// ── Mainnet addresses (uncomment after deploy) ──
// import { celo } from "wagmi/chains";
// export const CHAIN = celo;
// USDC Mainnet: 0xcebA9300f2b948710d2653dD7B07f33A8B32118C
