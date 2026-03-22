import { Hono } from "hono";
import { cors } from "hono/cors";
import { createWalletClient, createPublicClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { paymentMiddleware } from "@x402/hono";
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import "dotenv/config";

// ─── Config ──────────────────────────────────────────────
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const AGENTHANDS_ADDRESS = process.env.AGENTHANDS_ADDRESS as `0x${string}`;
const PINATA_JWT = process.env.PINATA_JWT;
const PAY_TO = process.env.WALLET_ADDRESS as `0x${string}`;

const CHAINS: Record<string, { rpc: string; usdc: `0x${string}`; chain: typeof baseSepolia }> = {
  "base-sepolia": {
    rpc: process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org",
    usdc: (process.env.USDC_BASE_SEPOLIA || "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as `0x${string}`,
    chain: baseSepolia,
  },
};

// ─── ABI (minimal) ──────────────────────────────────────
const ERC20_ABI = [
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

const AGENTHANDS_ABI = [
  { name: "createTask", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_paymentToken", type: "address" }, { name: "_reward", type: "uint256" }, { name: "_deadline", type: "uint256" }, { name: "_completionDeadline", type: "uint256" }, { name: "_title", type: "string" }, { name: "_description", type: "string" }, { name: "_location", type: "string" }], outputs: [{ type: "uint256" }] },
  { name: "approveTask", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_taskId", type: "uint256" }], outputs: [] },
  { name: "disputeTask", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_taskId", type: "uint256" }], outputs: [] },
  { name: "getTask", type: "function", stateMutability: "view", inputs: [{ name: "_taskId", type: "uint256" }], outputs: [{ type: "tuple", components: [{ name: "id", type: "uint256" }, { name: "agent", type: "address" }, { name: "worker", type: "address" }, { name: "paymentToken", type: "address" }, { name: "reward", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "completionDeadline", type: "uint256" }, { name: "title", type: "string" }, { name: "description", type: "string" }, { name: "location", type: "string" }, { name: "proofCID", type: "string" }, { name: "status", type: "uint8" }, { name: "createdAt", type: "uint256" }] }] },
  { name: "taskCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "rateWorker", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_taskId", type: "uint256" }, { name: "_score", type: "uint8" }], outputs: [] },
] as const;

// ─── Clients ─────────────────────────────────────────────
const account = privateKeyToAccount(PRIVATE_KEY);

function getClients(chainKey: string) {
  const config = CHAINS[chainKey];
  if (!config) throw new Error(`Unknown chain: ${chainKey}`);

  const publicClient = createPublicClient({ chain: config.chain, transport: http(config.rpc) });
  const walletClient = createWalletClient({ account, chain: config.chain, transport: http(config.rpc) });

  return { publicClient, walletClient, config };
}

// ─── x402 Setup ──────────────────────────────────────────
const facilitator = new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" });
const x402Server = new x402ResourceServer(facilitator);
x402Server.register("eip155:84532", new ExactEvmScheme());

// ─── App ─────────────────────────────────────────────────
const app = new Hono();
app.use("/*", cors());

// Health check (free — no payment)
app.get("/", (c) => c.json({
  service: "AgentHands",
  description: "Marketplace for AI agents to hire humans for physical-world tasks",
  status: "ok",
  agent: account.address,
  docs: "/skills.md",
  x402: {
    enabled: true,
    network: "eip155:84532",
    currency: "USDC",
    endpoints: {
      "POST /api/agent/tasks": "$0.01 — Create a task",
      "POST /api/agent/tasks/:id/approve": "$0.001 — Approve & pay worker",
      "POST /api/agent/tasks/:id/dispute": "$0.001 — Dispute proof",
      "POST /api/agent/tasks/:id/rate": "$0.001 — Rate worker",
      "GET /api/agent/tasks/:id": "FREE",
      "POST /api/ipfs/upload": "$0.001 — Upload proof to IPFS",
    },
  },
}));

// ─── x402-Protected Routes ───────────────────────────────

// Create Task — $0.01 per task creation
app.post(
  "/api/agent/tasks",
  paymentMiddleware(
    x402Server,
    {
      scheme: "exact",
      price: "$0.01",
      network: "eip155:84532",
      payTo: PAY_TO,
    },
    {
      description: "Create a task on AgentHands — hire a human for a physical-world job. USDC reward is locked in escrow.",
      mimeType: "application/json",
    },
  ),
  async (c) => {
    const body = await c.req.json();
    const { title, description, location, reward, deadlineHours = 24, completionHours = 72, chain = "base-sepolia" } = body;

    if (!title || !description || !location || !reward) {
      return c.json({ error: "Missing required fields: title, description, location, reward" }, 400);
    }

    const { publicClient, walletClient, config } = getClients(chain);
    const amount = parseUnits(String(reward), 6);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(deadlineHours) * 3600);
    const completionDeadline = BigInt(Math.floor(Date.now() / 1000) + Number(completionHours) * 3600);

    const approveTx = await walletClient.writeContract({
      address: config.usdc,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [AGENTHANDS_ADDRESS, amount],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });

    const createTx = await walletClient.writeContract({
      address: AGENTHANDS_ADDRESS,
      abi: AGENTHANDS_ABI,
      functionName: "createTask",
      args: [config.usdc, amount, deadline, completionDeadline, title, description, location],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: createTx });

    return c.json({
      success: true,
      txHash: createTx,
      blockNumber: Number(receipt.blockNumber),
      task: { title, description, location, reward, chain },
    });
  },
);

// Approve Task — $0.001
app.post(
  "/api/agent/tasks/:id/approve",
  paymentMiddleware(
    x402Server,
    {
      scheme: "exact",
      price: "$0.001",
      network: "eip155:84532",
      payTo: PAY_TO,
    },
    { description: "Approve task proof and release USDC payment to the worker." },
  ),
  async (c) => {
    const taskId = BigInt(c.req.param("id"));
    const { chain = "base-sepolia" } = await c.req.json().catch(() => ({}));

    const { publicClient, walletClient } = getClients(chain);
    const tx = await walletClient.writeContract({
      address: AGENTHANDS_ADDRESS,
      abi: AGENTHANDS_ABI,
      functionName: "approveTask",
      args: [taskId],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });

    return c.json({ success: true, txHash: tx });
  },
);

// Dispute Task — $0.001
app.post(
  "/api/agent/tasks/:id/dispute",
  paymentMiddleware(
    x402Server,
    {
      scheme: "exact",
      price: "$0.001",
      network: "eip155:84532",
      payTo: PAY_TO,
    },
    { description: "Dispute task proof — owner will arbitrate." },
  ),
  async (c) => {
    const taskId = BigInt(c.req.param("id"));
    const { chain = "base-sepolia" } = await c.req.json().catch(() => ({}));

    const { publicClient, walletClient } = getClients(chain);
    const tx = await walletClient.writeContract({
      address: AGENTHANDS_ADDRESS,
      abi: AGENTHANDS_ABI,
      functionName: "disputeTask",
      args: [taskId],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });

    return c.json({ success: true, txHash: tx });
  },
);

// Rate Worker — $0.001
app.post(
  "/api/agent/tasks/:id/rate",
  paymentMiddleware(
    x402Server,
    {
      scheme: "exact",
      price: "$0.001",
      network: "eip155:84532",
      payTo: PAY_TO,
    },
    { description: "Rate a worker (1-5 stars)." },
  ),
  async (c) => {
    const taskId = BigInt(c.req.param("id"));
    const { score, chain = "base-sepolia" } = await c.req.json();

    if (!score || score < 1 || score > 5) {
      return c.json({ error: "Score must be 1-5" }, 400);
    }

    const { publicClient, walletClient } = getClients(chain);
    const tx = await walletClient.writeContract({
      address: AGENTHANDS_ADDRESS,
      abi: AGENTHANDS_ABI,
      functionName: "rateWorker",
      args: [taskId, score],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });

    return c.json({ success: true, txHash: tx });
  },
);

// Get Task (FREE — no x402)
app.get("/api/agent/tasks/:id", async (c) => {
  const taskId = BigInt(c.req.param("id"));
  const chain = c.req.query("chain") || "base-sepolia";

  const { publicClient } = getClients(chain);
  const task = await publicClient.readContract({
    address: AGENTHANDS_ADDRESS,
    abi: AGENTHANDS_ABI,
    functionName: "getTask",
    args: [taskId],
  });

  return c.json({ task });
});

// IPFS Upload — $0.001
app.post(
  "/api/ipfs/upload",
  paymentMiddleware(
    x402Server,
    {
      scheme: "exact",
      price: "$0.001",
      network: "eip155:84532",
      payTo: PAY_TO,
    },
    { description: "Upload a file to IPFS via Pinata. Returns CID and gateway URL." },
  ),
  async (c) => {
    const formData = await c.req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    const pinataForm = new FormData();
    pinataForm.append("file", file);
    pinataForm.append("pinataMetadata", JSON.stringify({ name: `agenthands-proof-${Date.now()}` }));

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: pinataForm,
    });

    if (!res.ok) {
      const err = await res.text();
      return c.json({ error: "Pinata upload failed", details: err }, 500);
    }

    const data = await res.json();

    return c.json({
      success: true,
      cid: data.IpfsHash,
      url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
      size: data.PinSize,
    });
  },
);

// ─── Start ───────────────────────────────────────────────
const port = Number(process.env.PORT) || 3001;
console.log(`🤝 AgentHands Backend running on http://localhost:${port}`);
console.log(`💰 x402 enabled — agents pay USDC to create tasks`);

export default { port, fetch: app.fetch };
