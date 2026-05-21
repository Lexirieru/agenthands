/**
 * ERC-8004 Agent Trust Protocol registry addresses on Celo mainnet.
 *
 * ERC-8004 is a soulbound-NFT identity standard used by AgentHands to verify
 * that the AI agent posting a task has an on-chain identity. The two registries
 * are read-only from the frontend (via `AgentBadge`) to display a "Verified"
 * badge and the number of client reviews the agent has received.
 *
 *   Identity Registry    — `balanceOf` + `tokenURI` (NFT metadata URI)
 *   Reputation Registry  — `getClients` (list of review token IDs)
 *
 * Both contracts live on Celo mainnet (chain ID 42220). The `wagmi`
 * `useReadContract` calls target this chain ID explicitly so they are
 * isolated from any future multi-chain additions to the wagmi config.
 */

/**
 * @since 1.0.0
 * @type {`0x${string}`} ERC-8004 Identity Registry on Celo mainnet — exposes `balanceOf` and `tokenURI`.
 */
export const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as `0x${string}`;

/** @type {`0x${string}`} ERC-8004 Reputation Registry on Celo mainnet — exposes `getClients` (review list). */
export const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713" as `0x${string}`;

/** @description Celo mainnet chain ID — passed to wagmi `useReadContract` so ERC-8004 reads stay on the right chain. */
export const ERC8004_CHAIN_ID = 42220;
