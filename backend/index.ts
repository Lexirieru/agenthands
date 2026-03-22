import { Hono } from "hono";
import { cors } from "hono/cors";
import { createWalletClient, createPublicClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, celoAlfajores } from "viem/chains";
import { paymentMiddlewareFromConfig } from "@x402/hono";
import { HTTPFacilitatorClient } from "@x402/core/server";
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

// ─── ERC-8004: Agent Identity ────────────────────────────
const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as `0x${string}`;
const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713" as `0x${string}`;

const celoSepoliaChain = {
  ...celoAlfajores,
  id: 11142220 as const,
  name: "Celo Sepolia",
  rpcUrls: { default: { http: ["https://forno.celo-sepolia.celo-testnet.org"] as const } },
};

const IDENTITY_ABI = [
  { name: "register", type: "function", stateMutability: "nonpayable", inputs: [{ name: "metadataURI", type: "string" }], outputs: [{ type: "uint256" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "tokenOfOwnerByIndex", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "index", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "tokenURI", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "string" }] },
] as const;

const REPUTATION_ABI = [
  { name: "getClients", type: "function", stateMutability: "view", inputs: [{ name: "agentId", type: "uint256" }], outputs: [{ type: "address[]" }] },
] as const;

function getCeloClients() {
  const publicClient = createPublicClient({ chain: celoSepoliaChain, transport: http("https://forno.celo-sepolia.celo-testnet.org") });
  const walletClient = createWalletClient({ account, chain: celoSepoliaChain, transport: http("https://forno.celo-sepolia.celo-testnet.org") });
  return { publicClient, walletClient };
}

// ─── x402 Route Config ───────────────────────────────────
const x402Routes = {
  "POST /api/agent/tasks": {
    accepts: { scheme: "exact" as const, price: "$0.01", network: "eip155:84532", payTo: PAY_TO },
    description: "Create a task on AgentHands — hire a human for a physical-world job.",
    mimeType: "application/json",
  },
  "POST /api/agent/tasks/*/approve": {
    accepts: { scheme: "exact" as const, price: "$0.001", network: "eip155:84532", payTo: PAY_TO },
    description: "Approve task proof and release USDC payment.",
  },
  "POST /api/agent/tasks/*/dispute": {
    accepts: { scheme: "exact" as const, price: "$0.001", network: "eip155:84532", payTo: PAY_TO },
    description: "Dispute task proof.",
  },
  "POST /api/agent/tasks/*/rate": {
    accepts: { scheme: "exact" as const, price: "$0.001", network: "eip155:84532", payTo: PAY_TO },
    description: "Rate a worker (1-5 stars).",
  },
  "POST /api/ipfs/upload": {
    accepts: { scheme: "exact" as const, price: "$0.001", network: "eip155:84532", payTo: PAY_TO },
    description: "Upload a file to IPFS.",
  },
};

// ─── Webhook Store (in-memory) ───────────────────────────
const webhooks = new Map<string, string>(); // taskId → webhookUrl

async function notifyAgent(taskId: string, status: string, proofCID?: string) {
  const url = webhooks.get(taskId);
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "task_status_changed",
        taskId,
        status,
        proofCID,
        timestamp: new Date().toISOString(),
      }),
    });
    console.log(`📡 Webhook sent for task #${taskId} → ${url}`);
  } catch (err) {
    console.error(`❌ Webhook failed for task #${taskId}:`, err);
  }
}

// ─── App ─────────────────────────────────────────────────
const app = new Hono();
app.use("/*", cors());

// Health check (free)
app.get("/", (c) => c.json({
  service: "AgentHands",
  description: "Marketplace for AI agents to hire humans for physical-world tasks",
  status: "ok",
  agent: account.address,
  docs: "/skills.md",
  x402: { enabled: true, network: "eip155:84532", currency: "USDC" },
}));

// ─── x402 Payment Middleware ─────────────────────────────
const facilitator = new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" });
const schemes = [{ network: "eip155:84532", server: new ExactEvmScheme() }];

app.use("/api/agent/*", paymentMiddlewareFromConfig(x402Routes, [facilitator], schemes));
app.use("/api/ipfs/*", paymentMiddlewareFromConfig(x402Routes, [facilitator], schemes));

// ─── Agent: Create Task ──────────────────────────────────
app.post("/api/agent/tasks", async (c) => {
  const body = await c.req.json();
  const { title, description, location, reward, deadlineHours = 24, completionHours = 72, chain = "base-sepolia", webhookUrl } = body;

  if (!title || !description || !location || !reward) {
    return c.json({ error: "Missing required fields: title, description, location, reward" }, 400);
  }

  const { publicClient, walletClient, config } = getClients(chain);
  const amount = parseUnits(String(reward), 6);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(deadlineHours) * 3600);
  const completionDeadline = BigInt(Math.floor(Date.now() / 1000) + Number(completionHours) * 3600);

  const approveTx = await walletClient.writeContract({
    address: config.usdc, abi: ERC20_ABI, functionName: "approve",
    args: [AGENTHANDS_ADDRESS, amount],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });

  const createTx = await walletClient.writeContract({
    address: AGENTHANDS_ADDRESS, abi: AGENTHANDS_ABI, functionName: "createTask",
    args: [config.usdc, amount, deadline, completionDeadline, title, description, location],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: createTx });

  // Extract taskId from logs
  const taskCount = await publicClient.readContract({ address: AGENTHANDS_ADDRESS, abi: AGENTHANDS_ABI, functionName: "taskCount" });
  const taskId = taskCount.toString();

  // Register webhook if provided
  if (webhookUrl) {
    webhooks.set(taskId, webhookUrl);
    console.log(`🔔 Webhook registered for task #${taskId} → ${webhookUrl}`);
  }

  return c.json({ success: true, txHash: createTx, blockNumber: Number(receipt.blockNumber), taskId, webhookRegistered: !!webhookUrl, task: { title, description, location, reward, chain } });
});

// ─── Agent: Approve ──────────────────────────────────────
app.post("/api/agent/tasks/:id/approve", async (c) => {
  const taskId = BigInt(c.req.param("id"));
  const { chain = "base-sepolia" } = await c.req.json().catch(() => ({}));
  const { publicClient, walletClient } = getClients(chain);
  const tx = await walletClient.writeContract({ address: AGENTHANDS_ADDRESS, abi: AGENTHANDS_ABI, functionName: "approveTask", args: [taskId] });
  await publicClient.waitForTransactionReceipt({ hash: tx });
  return c.json({ success: true, txHash: tx });
});

// ─── Agent: Dispute ──────────────────────────────────────
app.post("/api/agent/tasks/:id/dispute", async (c) => {
  const taskId = BigInt(c.req.param("id"));
  const { chain = "base-sepolia" } = await c.req.json().catch(() => ({}));
  const { publicClient, walletClient } = getClients(chain);
  const tx = await walletClient.writeContract({ address: AGENTHANDS_ADDRESS, abi: AGENTHANDS_ABI, functionName: "disputeTask", args: [taskId] });
  await publicClient.waitForTransactionReceipt({ hash: tx });
  return c.json({ success: true, txHash: tx });
});

// ─── Agent: Rate ─────────────────────────────────────────
app.post("/api/agent/tasks/:id/rate", async (c) => {
  const taskId = BigInt(c.req.param("id"));
  const { score, chain = "base-sepolia" } = await c.req.json();
  if (!score || score < 1 || score > 5) return c.json({ error: "Score must be 1-5" }, 400);
  const { publicClient, walletClient } = getClients(chain);
  const tx = await walletClient.writeContract({ address: AGENTHANDS_ADDRESS, abi: AGENTHANDS_ABI, functionName: "rateWorker", args: [taskId, score] });
  await publicClient.waitForTransactionReceipt({ hash: tx });
  return c.json({ success: true, txHash: tx });
});

// ─── Agent: Get Task (FREE) ──────────────────────────────
app.get("/api/agent/tasks/:id", async (c) => {
  const taskId = BigInt(c.req.param("id"));
  const chain = c.req.query("chain") || "base-sepolia";
  const { publicClient } = getClients(chain);
  const task = await publicClient.readContract({ address: AGENTHANDS_ADDRESS, abi: AGENTHANDS_ABI, functionName: "getTask", args: [taskId] });
  // Serialize BigInt values to strings
  const serialized = JSON.parse(JSON.stringify(task, (_key, value) => typeof value === "bigint" ? value.toString() : value));
  return c.json({ task: serialized });
});

// ─── Notify: Worker submitted proof ──────────────────────
app.post("/api/notify/:id", async (c) => {
  const taskId = c.req.param("id");
  const { status, proofCID } = await c.req.json().catch(() => ({ status: "submitted", proofCID: "" }));
  await notifyAgent(taskId, status || "submitted", proofCID);
  return c.json({ success: true, notified: webhooks.has(taskId) });
});

// ─── Agent: Register/Update Webhook ──────────────────────
app.post("/api/agent/tasks/:id/webhook", async (c) => {
  const taskId = c.req.param("id");
  const { webhookUrl } = await c.req.json();
  if (!webhookUrl) return c.json({ error: "Missing webhookUrl" }, 400);
  webhooks.set(taskId, webhookUrl);
  return c.json({ success: true, taskId, webhookUrl });
});

// ─── Agent: List All Tasks (FREE) ────────────────────────
app.get("/api/agent/tasks", async (c) => {
  const chain = c.req.query("chain") || "base-sepolia";
  const { publicClient } = getClients(chain);
  const count = await publicClient.readContract({ address: AGENTHANDS_ADDRESS, abi: AGENTHANDS_ABI, functionName: "taskCount" });
  const tasks = [];
  for (let i = 1n; i <= count; i++) {
    const task = await publicClient.readContract({ address: AGENTHANDS_ADDRESS, abi: AGENTHANDS_ABI, functionName: "getTask", args: [i] });
    tasks.push(JSON.parse(JSON.stringify(task, (_key, value) => typeof value === "bigint" ? value.toString() : value)));
  }
  return c.json({ tasks, total: Number(count) });
});

// ─── ERC-8004: Status ────────────────────────────────────
app.get("/api/erc8004/status", async (c) => {
  const { publicClient } = getCeloClients();
  try {
    const balance = await publicClient.readContract({ address: IDENTITY_REGISTRY, abi: IDENTITY_ABI, functionName: "balanceOf", args: [account.address] });
    if (Number(balance) === 0) return c.json({ registered: false, agent: account.address });

    const tokenId = await publicClient.readContract({ address: IDENTITY_REGISTRY, abi: IDENTITY_ABI, functionName: "tokenOfOwnerByIndex", args: [account.address, 0n] });
    const uri = await publicClient.readContract({ address: IDENTITY_REGISTRY, abi: IDENTITY_ABI, functionName: "tokenURI", args: [tokenId] });
    const clients = await publicClient.readContract({ address: REPUTATION_REGISTRY, abi: REPUTATION_ABI, functionName: "getClients", args: [tokenId] });

    return c.json({ registered: true, agent: account.address, tokenId: Number(tokenId), metadataURI: uri, reviewCount: clients.length });
  } catch (error) {
    return c.json({ registered: false, agent: account.address, error: String(error) });
  }
});

// ─── ERC-8004: Register ──────────────────────────────────
app.post("/api/erc8004/register", async (c) => {
  const { publicClient, walletClient } = getCeloClients();
  const balance = await publicClient.readContract({ address: IDENTITY_REGISTRY, abi: IDENTITY_ABI, functionName: "balanceOf", args: [account.address] });
  if (Number(balance) > 0) return c.json({ error: "Agent already registered" }, 400);

  const { metadataURI } = await c.req.json().catch(() => ({ metadataURI: "" }));
  const tx = await walletClient.writeContract({ address: IDENTITY_REGISTRY, abi: IDENTITY_ABI, functionName: "register", args: [metadataURI || ""] });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  return c.json({ success: true, txHash: tx, blockNumber: Number(receipt.blockNumber) });
});

// ─── Self Protocol: Agent Identity + Verification ────────
import { SelfAgent } from "@selfxyz/agent-sdk";
import { SelfBackendVerifier, DefaultConfigStore, AllIds } from "@selfxyz/core";

// Initialize Self Agent (our agent's identity)
const selfAgent = new SelfAgent({ privateKey: PRIVATE_KEY });

// Backend verifier for QR code ZK proofs (from @selfxyz/qrcode)
const selfConfigStore = new DefaultConfigStore({
  minimumAge: 18,
});

const selfBackendVerifier = new SelfBackendVerifier(
  "agenthands-worker-verify",   // scope — must match frontend
  "https://agenthands-production.up.railway.app/api/self/verify", // endpoint — must match frontend (used for scope hash)
  true,                          // mockPassport — true for staging (uses Celo Sepolia)
  AllIds,                        // allow all attestation types
  selfConfigStore,               // verification config
  "hex",                         // userIdType — wallet addresses
);

// Agent registration status
app.get("/api/self/agent/status", async (c) => {
  try {
    const isRegistered = await selfAgent.isRegistered();
    const info = isRegistered ? await selfAgent.getInfo() : null;
    return c.json({
      address: selfAgent.address,
      registered: isRegistered,
      info,
    });
  } catch (error) {
    return c.json({ address: selfAgent.address, registered: false, error: String(error) });
  }
});

// Start agent registration (returns QR for human to scan)
app.post("/api/self/agent/register", async (c) => {
  try {
    const res = await fetch("https://app.ai.self.xyz/api/agent/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "linked",
        network: "testnet",
        humanAddress: account.address,
        disclosures: { minimumAge: 18, ofac: true },
      }),
    });
    const data = await res.json();
    return c.json(data);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Poll registration status
app.get("/api/self/agent/register/status", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.json({ error: "Missing token" }, 400);
  try {
    const res = await fetch(`https://app.ai.self.xyz/api/agent/register/status?token=${token}`);
    const data = await res.json();
    return c.json(data);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Verify QR code ZK proof from Self app (called by Self relayer)
app.post("/api/self/verify", async (c) => {
  try {
    const body = await c.req.json();
    const { attestationId, proof, publicSignals, userContextData } = body;

    const result = await selfBackendVerifier.verify(
      attestationId,
      proof,
      publicSignals,
      userContextData || "",
    );

    console.log("✅ Self verification success:", JSON.stringify(result.isValidDetails));
    return c.json({
      status: "success",
      result: true,
      credentialSubject: result.discloseOutput,
    });
  } catch (error) {
    console.error("❌ Self verification failed:", String(error));
    // Self relayer expects HTTP 200 with status field — never return 4xx/5xx
    return c.json({
      status: "error",
      result: false,
      reason: String(error),
    });
  }
});

// Agent credentials
app.get("/api/self/agent/credentials", async (c) => {
  try {
    const creds = await selfAgent.getCredentials();
    const strength = await selfAgent.getVerificationStrength();
    return c.json({ credentials: creds, verificationStrength: strength });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// ─── IPFS: Upload ────────────────────────────────────────
app.post("/api/ipfs/upload", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) return c.json({ error: "No file provided" }, 400);

  const pinataForm = new FormData();
  pinataForm.append("file", file);
  pinataForm.append("pinataMetadata", JSON.stringify({ name: `agenthands-proof-${Date.now()}` }));

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST", headers: { Authorization: `Bearer ${PINATA_JWT}` }, body: pinataForm,
  });
  if (!res.ok) { const err = await res.text(); return c.json({ error: "Pinata upload failed", details: err }, 500); }

  const data = await res.json();
  return c.json({ success: true, cid: data.IpfsHash, url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`, size: data.PinSize });
});

// ─── Start ───────────────────────────────────────────────
const port = Number(process.env.PORT) || 3001;
console.log(`🤝 AgentHands Backend running on http://localhost:${port}`);
console.log(`💰 x402 enabled — agents pay USDC to create tasks`);

export default { port, fetch: app.fetch };
