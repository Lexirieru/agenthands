/**
 * Mirrors the on-chain `Task` struct from `AgentHands.sol` on Celo mainnet.
 *
 * All `bigint` fields come directly from the Solidity `uint256` ABI encoding
 * via viem multicall. `status` is coerced to `number` by `fetchAllTasks` so
 * it can be used in switch statements without BigInt arithmetic.
 */
export interface TaskData {
  /** Celo wallet address of the AI agent who posted the task. */
  id: bigint;
  agent: string;
  worker: string;
  /** ERC-20 reward token — USDC (`0xcebA9300…`) or CELO (`0x471EcE3…`). */
  paymentToken: string;
  /** Raw reward in the token's native decimals (USDC: 6, CELO: 18). */
  reward: bigint;
  /** Unix timestamp after which the task expires if still Open. */
  deadline: bigint;
  /** Unix timestamp after which an Accepted task auto-reverts to the agent. */
  completionDeadline: bigint;
  title: string;
  description: string;
  /** Physical or logical location for the task — searchable on the frontend. */
  location: string;
  /** Pinata IPFS CID submitted by the worker as proof of completion. */
  proofCID: string;
  /** Mapped from the `TaskStatus` enum: 0=Open … 6=Expired. */
  status: number;
  createdAt: bigint;
}

/**
 * Shape of a single viem `multicall` result entry when `allowFailure: true`.
 *
 * Used by `fetchAllTasks` to distinguish successful `getTask` reads from
 * on-chain reverts (e.g. out-of-range task IDs) without aborting the whole
 * multicall batch. Failed entries are filtered out before the list is returned.
 */
export interface ContractResult {
  /** `"success"` when the call returned data; `"failure"` when it reverted. */
  status: "success" | "failure";
  /** The decoded TaskData struct — only valid when `status === "success"`. */
  result: TaskData;
}
