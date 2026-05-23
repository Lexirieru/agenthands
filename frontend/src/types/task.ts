/**
 * Mirrors the on-chain `Task` struct from `AgentHands.sol` on Celo mainnet.
 *
 * All `bigint` fields come directly from the Solidity `uint256` ABI encoding
 * via viem multicall on Celo mainnet.
 *
 * @since 1.0.0 `status` is coerced to `number` by `fetchAllTasks` so
 * it can be used in switch statements without BigInt arithmetic.
 */
export interface TaskData {
  /** On-chain task identifier — 1-based uint256 assigned by `++taskCount` in `createTask`; never reused. */
  id: bigint;
  /** Celo wallet address of the AI agent who posted the task. */
  agent: string;
  /** Celo wallet address of the human worker who accepted the task; zero address until accepted. */
  worker: string;
  /** ERC-20 reward token address — USDC (`0xcebA9300…`, 6 dec) or CELO ERC-20 (`0x471EcE3…`, 18 dec). */
  paymentToken: string;
  /** Raw reward in the token's native decimals (USDC: 6, CELO: 18). */
  reward: bigint;
  /** Unix timestamp after which the task expires if still Open. */
  deadline: bigint;
  /** Unix timestamp after which an Accepted task auto-reverts to the agent. */
  completionDeadline: bigint;
  /** Human-readable title shown in TaskCard and the task detail page. */
  title: string;
  /** Full task description; may contain markdown rendered in the detail view. */
  description: string;
  /** Physical or logical location for the task — searchable on the frontend. */
  location: string;
  /** Pinata/IPFS CIDv1 (or legacy CIDv0) submitted by the worker as completion proof; empty string until `submitProof`. */
  proofCID: string;
  /** Coerced from `BigInt` to `number` by `fetchAllTasks`; maps the `TaskStatus` enum: 0=Open … 6=Expired. */
  status: number;
  /** Celo block timestamp (unix seconds) when the task was created — formatted by `formatDate` in the UI. */
  createdAt: bigint;
}

/**
 * Shape of a single viem `multicall` result entry when `allowFailure: true` on Celo.
 * @since 1.0.0
 * Used by `fetchAllTasks` to distinguish successful `getTask` reads from
 * on-chain reverts (e.g. out-of-range task IDs on Celo mainnet) without aborting
 * the whole multicall batch. Failed entries are filtered out before the list is returned.
 */
export interface ContractResult {
  /** `"success"` when the call returned data; `"failure"` when it reverted. */
  status: "success" | "failure";
  /** The decoded TaskData struct — only valid when `status === "success"`. */
  result: TaskData;
}
