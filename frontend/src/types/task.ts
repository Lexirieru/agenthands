export interface TaskData {
  id: bigint;
  agent: string;
  worker: string;
  paymentToken: string; // ERC20 token address (USDC on Celo mainnet)
  reward: bigint;       // in token's native decimals (USDC: 6 decimals)
  deadline: bigint;
  completionDeadline: bigint;
  title: string;
  description: string;
  location: string;
  proofCID: string;
  status: number;
  createdAt: bigint;
}

export interface ContractResult {
  status: "success" | "failure";
  result: TaskData;
}
