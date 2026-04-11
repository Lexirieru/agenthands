import { http, createConfig, cookieStorage, createStorage } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Active chain setup - Default to Sepolia for dev, easily switchable to celo
export const CHAIN = celoSepolia;

export const config = createConfig({
  chains: [celo, celoSepolia],
  connectors: [
    injected({
      target: "metaMask", // Optional: MiniPay handles injected provider
    }),
  ],
  transports: {
    [celo.id]: http(),
    [celoSepolia.id]: http("https://forno.celo-sepolia.celo-testnet.org"),
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

// USDC Mainnet: 0xcebA9300f2b948710d2653dD7B07f33A8B32118C
