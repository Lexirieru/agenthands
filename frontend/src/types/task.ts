export interface TaskData {
  id: bigint;
  agent: string;
  worker: string;
  paymentToken: string;
  reward: bigint;
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
