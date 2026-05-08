import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { createWalletClient, createPublicClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoSepolia } from "viem/chains";
import { createThirdwebClient } from "thirdweb";
import { celoSepoliaTestnet as twCeloSepolia } from "thirdweb/chains";
import { facilitator, settlePayment } from "thirdweb/x402";
import "dotenv/config";

// ─── Config ──────────────────────────────────────────────
// Railway (and most env-file based deploys) love to slip trailing
// newlines or whitespace into pasted secrets. A single \n on
// THIRDWEB_SECRET_KEY or WALLET_ADDRESS was enough to make the
// thirdweb facilitator reject our /accepts request with
// "Invalid character". Strip everything on read.
function requireEnv(name: string): string {
  const raw = process.env[name];
  const v = raw?.trim();
  if (!v) {
    console.error(`❌ Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

function optionalEnv(name: string, fallback: string): string {
  const v = process.env[name]?.trim();
  return v && v.length > 0 ? v : fallback;
}

const PRIVATE_KEY = requireEnv("PRIVATE_KEY") as `0x${string}`;
const AGENTHANDS_ADDRESS = requireEnv("AGENTHANDS_ADDRESS") as `0x${string}`;
const PAY_TO = requireEnv("WALLET_ADDRESS") as `0x${string}`;
const THIRDWEB_SECRET_KEY = requireEnv("THIRDWEB_SECRET_KEY");
const PINATA_JWT = process.env.PINATA_JWT?.trim(); // optional — only /api/ipfs/upload needs it
const USDC_ADDRESS = optionalEnv(
  "USDC_ADDRESS",
  "0x01C5C0122039549AD1493B8220cABEdD739BC44E"
) as `0x${string}`;
const CELO_SEPOLIA_RPC = optionalEnv(
  "CELO_SEPOLIA_RPC",
  "https://forno.celo-sepolia.celo-testnet.org"
);

// Fingerprint each env var at boot so we can spot invisible-char
// pollution from Railway logs without ever printing the secrets.
function fingerprint(name: string, v: string | undefined) {
  if (!v) return `${name}=(unset)`;
  return `${name} len=${v.length} tail=${JSON.stringify(v.slice(-4))}`;
}
console.log(
  "🔑 env fingerprints:",
  [
    fingerprint("AGENTHANDS_ADDRESS", AGENTHANDS_ADDRESS),
    fingerprint("WALLET_ADDRESS", PAY_TO),
    fingerprint("USDC_ADDRESS", USDC_ADDRESS),
    fingerprint("THIRDWEB_SECRET_KEY", THIRDWEB_SECRET_KEY),
    fingerprint("CELO_SEPOLIA_RPC", CELO_SEPOLIA_RPC),
  ].join(" | ")
);

// thirdweb client — powers the x402 facilitator that knows how to settle
// payments on Celo (the public x402.org facilitator doesn't).
const thirdwebClient = createThirdwebClient({ secretKey: THIRDWEB_SECRET_KEY });
const twFacilitator = facilitator({
  client: thirdwebClient,
  serverWalletAddress: PAY_TO,
});
const X402_NETWORK_CHAIN = twCeloSepolia; // task escrow + fees both on Celo Sepolia
const X402_NETWORK_LABEL = `eip155:${celoSepolia.id}`;

// Simple write-queue: the backend agent wallet is singleton, so concurrent
// writeContract calls would race on the nonce. Serialize all writes through
// this lock so they go out one after another.
let writeLock: Promise<unknown> = Promise.resolve();
async function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = writeLock.catch(() => undefined);
  let release: () => void = () => {};
  writeLock = new Promise<void>((r) => {
    release = r;
  });
  try {
    await prev;
    return await fn();
  } finally {
    release();
  }
}

// ─── ABI (minimal, USDC/ERC20 escrow) ────────────────────
const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

const AGENTHANDS_ABI = [
  {
    name: "createTask",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_paymentToken", type: "address" },
      { name: "_reward", type: "uint256" },
      { name: "_deadline", type: "uint256" },
      { name: "_completionDeadline", type: "uint256" },
      { name: "_title", type: "string" },
      { name: "_description", type: "string" },
      { name: "_location", type: "string" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "approveTask",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_taskId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "disputeTask",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_taskId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "getTask",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_taskId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "agent", type: "address" },
          { name: "worker", type: "address" },
          { name: "paymentToken", type: "address" },
          { name: "reward", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "completionDeadline", type: "uint256" },
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "location", type: "string" },
          { name: "proofCID", type: "string" },
          { name: "status", type: "uint8" },
          { name: "createdAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "taskCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "rateWorker",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_taskId", type: "uint256" },
      { name: "_score", type: "uint8" },
    ],
    outputs: [],
  },
] as const;

// ─── Clients (Celo Sepolia, USDC escrow) ─────────────────
const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({
  chain: celoSepolia,
  transport: http(CELO_SEPOLIA_RPC),
});
const walletClient = createWalletClient({
  account,
  chain: celoSepolia,
  transport: http(CELO_SEPOLIA_RPC),
});

// ─── ERC-8004: Agent Identity (on Celo Sepolia) ──────────
const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as `0x${string}`;
const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713" as `0x${string}`;

const IDENTITY_ABI = [
  { name: "register", type: "function", stateMutability: "nonpayable", inputs: [{ name: "metadataURI", type: "string" }], outputs: [{ type: "uint256" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "tokenOfOwnerByIndex", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "index", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "tokenURI", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "string" }] },
] as const;

const REPUTATION_ABI = [
  { name: "getClients", type: "function", stateMutability: "view", inputs: [{ name: "agentId", type: "uint256" }], outputs: [{ type: "address[]" }] },
] as const;

// ─── x402 helper: charge USDC on Celo Sepolia per request ────
// thirdweb's facilitator settles payment in a stablecoin on the specified
// chain. We pass the USDC asset explicitly (not a "$0.01" dollar string) so
// the facilitator never has to resolve the token via its registry — that
// was causing accepts: [] on networks it hasn't indexed.
async function requirePayment(
  c: Context,
  opts: { priceUsdcAtomic: string; description?: string }
): Promise<Response | null> {
  const paymentData =
    c.req.header("PAYMENT-SIGNATURE") || c.req.header("X-PAYMENT") || null;

  // Railway terminates TLS at the edge — inside the container, Hono sees
  // http://. Rebuild the URL with https:// so x402 payment signatures
  // match what the agent actually signed against.
  //
  // Proxies sometimes pass *multi-value* forwarded headers like
  // "https, http" or "example.com, internal-host" — feeding those into
  // a URL string produces "Invalid character" downstream. Take only the
  // first hop and trim anything around it.
  let resourceUrl = c.req.url;
  try {
    const firstHop = (h: string | undefined) => h?.split(",")[0]?.trim();
    const forwardedProto = firstHop(c.req.header("x-forwarded-proto"));
    const host = firstHop(c.req.header("host"));
    const path = c.req.path;
    if (host) {
      const isLocal = host.includes("localhost") || host.startsWith("127.");
      const proto = forwardedProto || (isLocal ? "http" : "https");
      // new URL() validates the result; if anything slips through as an
      // invalid character the try/catch below falls back to c.req.url.
      resourceUrl = new URL(path, `${proto}://${host}`).toString();
    }
  } catch {
    // fall through with c.req.url — thirdweb still accepts http:// urls
  }

  try {
    // Debug: log everything we're about to hand the facilitator, so the
    // next "Invalid character" breakage tells us *which* field carried
    // the bad byte. JSON.stringify would explode on BigInt inside the
    // chain object, so spell out the shape.
    console.log("💳 settlePayment args:", {
      resourceUrl,
      method: c.req.method,
      payTo: PAY_TO,
      network: { id: X402_NETWORK_CHAIN.id, name: X402_NETWORK_CHAIN.name },
      price: { amount: opts.priceUsdcAtomic, asset: USDC_ADDRESS, decimals: 6 },
      paymentDataBytes: paymentData?.length ?? 0,
    });

    const result = await settlePayment({
      resourceUrl,
      method: c.req.method as "GET" | "POST",
      paymentData,
      payTo: PAY_TO,
      network: X402_NETWORK_CHAIN,
      price: {
        amount: opts.priceUsdcAtomic,
        asset: {
          address: USDC_ADDRESS,
          decimals: 6,
        },
      },
      facilitator: twFacilitator,
      routeConfig: {
        description: opts.description ?? "",
        mimeType: "application/json",
      },
    });

    if (result.status === 200) return null; // payment OK, let the handler run

    // Log the 402 body so we can spot empty-accepts in Railway logs.
    console.warn(
      `💳 x402 gate returned ${result.status} for ${c.req.method} ${resourceUrl}`,
      JSON.stringify(result.responseBody)
    );

    // Forward thirdweb's response (body + headers) verbatim so x402 clients
    // can parse the payment requirements.
    return new Response(JSON.stringify(result.responseBody), {
      status: result.status,
      headers: {
        ...result.responseHeaders,
        "content-type": "application/json",
      },
    });
  } catch (err) {
    // Without this, a throw inside settlePayment (facilitator error,
    // network issue, schema mismatch, etc) turns into a bare Hono 500.
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`💳 x402 settlePayment threw on ${c.req.method} ${resourceUrl}:`, err);
    return c.json(
      {
        error: "x402 gate failed",
        reason: reason.slice(0, 500),
        resource: resourceUrl,
      },
      500
    );
  }
}

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
  chain: celoSepolia.name,
  chainId: celoSepolia.id,
  escrowToken: { symbol: "USDC", address: USDC_ADDRESS },
  docs: "/skills.md",
  x402: {
    enabled: true,
    network: X402_NETWORK_LABEL,
    facilitator: "thirdweb",
    currency: "USDC",
  },
}));

// Best-effort extraction of a revert reason from viem errors so callers get
// a readable 400 instead of an opaque 500.
function describeContractError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message ?? "";
    // viem wraps custom-error selectors and reasons in the message string
    const match = msg.match(/reverted(?: with reason| with custom error \(.*?\))?:?\s*([\s\S]*?)(?:\n|$)/i);
    if (match?.[1]) return match[1].trim().slice(0, 240);
    return msg.slice(0, 240);
  }
  return String(err).slice(0, 240);
}

// ─── Agent: Create Task ──────────────────────────────────
app.post("/api/agent/tasks", async (c) => {
  // 1. Validate the request BEFORE charging the x402 fee — bad requests
  //    shouldn't burn the agent's micropayment.
  const body = await c.req.json().catch(() => ({}));
  const { title, description, location, reward, deadlineHours = 24, completionHours = 72, webhookUrl } = body;

  if (!title || !description || !location || reward === undefined) {
    return c.json({ error: "Missing required fields: title, description, location, reward" }, 400);
  }
  if (Number(reward) <= 0 || Number.isNaN(Number(reward))) {
    return c.json({ error: "reward must be a positive number" }, 400);
  }
  if (Number(deadlineHours) <= 0 || Number(completionHours) <= Number(deadlineHours)) {
    return c.json({ error: "completionHours must be greater than deadlineHours, both positive" }, 400);
  }

  let amount: bigint;
  try {
    amount = parseUnits(String(reward), 6); // USDC has 6 decimals
  } catch {
    return c.json({ error: `invalid reward "${reward}" — not a decimal number` }, 400);
  }

  // 2. Charge the agent for: reward + $0.001 platform fee.
  //    The backend wallet receives this whole amount via x402 settlement,
  //    then forwards `amount` into escrow via createTask. Net flow:
  //      agent (-reward -0.001) → backend (+0.001, transit reward) → escrow (+reward)
  //    So the operator never has to pre-fund USDC for escrow on mainnet.
  const X402_FEE_ATOMIC = 1000n; // $0.001 USDC
  const totalCharge = (amount + X402_FEE_ATOMIC).toString();
  const pay = await requirePayment(c, {
    priceUsdcAtomic: totalCharge,
    description: "Create a task on AgentHands: reward escrow + 0.001 USDC fee, settled in USDC on Celo.",
  });
  if (pay) return pay;

  const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(deadlineHours) * 3600);
  const completionDeadline = BigInt(Math.floor(Date.now() / 1000) + Number(completionHours) * 3600);

  let approveTx: `0x${string}` | null = null;

  try {
    // Serialize writes so concurrent requests don't race on the shared wallet's nonce.
    const { approveTx: at, createTx, receipt, taskId } = await withWriteLock(async () => {
      const allowance = (await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [account.address, AGENTHANDS_ADDRESS],
      })) as bigint;

      let approveTx: `0x${string}` | null = null;
      if (allowance < amount) {
        approveTx = await walletClient.writeContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [AGENTHANDS_ADDRESS, amount],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });
      }

      const createTx = await walletClient.writeContract({
        address: AGENTHANDS_ADDRESS,
        abi: AGENTHANDS_ABI,
        functionName: "createTask",
        args: [USDC_ADDRESS, amount, deadline, completionDeadline, title, description, location],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: createTx });

      const taskCount = (await publicClient.readContract({
        address: AGENTHANDS_ADDRESS,
        abi: AGENTHANDS_ABI,
        functionName: "taskCount",
      })) as bigint;

      return { approveTx, createTx, receipt, taskId: taskCount.toString() };
    });
    approveTx = at;

    if (webhookUrl) {
      webhooks.set(taskId, webhookUrl);
      console.log(`🔔 Webhook registered for task #${taskId} → ${webhookUrl}`);
    }

    return c.json({
      success: true,
      approveTxHash: approveTx,
      skippedApprove: approveTx === null,
      txHash: createTx,
      blockNumber: Number(receipt.blockNumber),
      taskId,
      webhookRegistered: !!webhookUrl,
      task: { title, description, location, reward, currency: "USDC" },
    });
  } catch (err) {
    const reason = describeContractError(err);
    console.error("❌ createTask failed:", reason);
    return c.json({ error: "createTask failed", reason, approveTxHash: approveTx }, 400);
  }
});

// ─── Agent: Approve ──────────────────────────────────────
app.post("/api/agent/tasks/:id/approve", async (c) => {
  const taskId = BigInt(c.req.param("id"));

  const pay = await requirePayment(c, { priceUsdcAtomic: "1000", description: "Approve task and release USDC payment." });
  if (pay) return pay;

  try {
    const tx = await withWriteLock(() =>
      walletClient.writeContract({
        address: AGENTHANDS_ADDRESS,
        abi: AGENTHANDS_ABI,
        functionName: "approveTask",
        args: [taskId],
      })
    );
    await publicClient.waitForTransactionReceipt({ hash: tx });
    return c.json({ success: true, txHash: tx });
  } catch (err) {
    return c.json({ error: "approveTask failed", reason: describeContractError(err) }, 400);
  }
});

// ─── Agent: Dispute ──────────────────────────────────────
app.post("/api/agent/tasks/:id/dispute", async (c) => {
  const taskId = BigInt(c.req.param("id"));

  const pay = await requirePayment(c, { priceUsdcAtomic: "1000", description: "Dispute task proof." });
  if (pay) return pay;

  try {
    const tx = await withWriteLock(() =>
      walletClient.writeContract({
        address: AGENTHANDS_ADDRESS,
        abi: AGENTHANDS_ABI,
        functionName: "disputeTask",
        args: [taskId],
      })
    );
    await publicClient.waitForTransactionReceipt({ hash: tx });
    return c.json({ success: true, txHash: tx });
  } catch (err) {
    return c.json({ error: "disputeTask failed", reason: describeContractError(err) }, 400);
  }
});

// ─── Agent: Rate ─────────────────────────────────────────
app.post("/api/agent/tasks/:id/rate", async (c) => {
  // Validate the score BEFORE charging the x402 fee.
  const taskId = BigInt(c.req.param("id"));
  const body = await c.req.json().catch(() => ({}));
  const { score } = body;
  if (!score || score < 1 || score > 5) return c.json({ error: "Score must be 1-5" }, 400);

  const pay = await requirePayment(c, { priceUsdcAtomic: "1000", description: "Rate a worker 1-5 stars." });
  if (pay) return pay;

  try {
    const tx = await withWriteLock(() =>
      walletClient.writeContract({
        address: AGENTHANDS_ADDRESS,
        abi: AGENTHANDS_ABI,
        functionName: "rateWorker",
        args: [taskId, score],
      })
    );
    await publicClient.waitForTransactionReceipt({ hash: tx });
    return c.json({ success: true, txHash: tx });
  } catch (err) {
    return c.json({ error: "rateWorker failed", reason: describeContractError(err) }, 400);
  }
});

// ─── Agent: Get Task (FREE) ──────────────────────────────
app.get("/api/agent/tasks/:id", async (c) => {
  const taskId = BigInt(c.req.param("id"));
  const task = await publicClient.readContract({
    address: AGENTHANDS_ADDRESS,
    abi: AGENTHANDS_ABI,
    functionName: "getTask",
    args: [taskId],
  });
  const serialized = JSON.parse(
    JSON.stringify(task, (_key, value) => (typeof value === "bigint" ? value.toString() : value))
  );
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
  const count = await publicClient.readContract({
    address: AGENTHANDS_ADDRESS,
    abi: AGENTHANDS_ABI,
    functionName: "taskCount",
  });
  const tasks = [];
  for (let i = 1n; i <= count; i++) {
    const task = await publicClient.readContract({
      address: AGENTHANDS_ADDRESS,
      abi: AGENTHANDS_ABI,
      functionName: "getTask",
      args: [i],
    });
    tasks.push(
      JSON.parse(JSON.stringify(task, (_key, value) => (typeof value === "bigint" ? value.toString() : value)))
    );
  }
  return c.json({ tasks, total: Number(count) });
});

// ─── ERC-8004: Status ────────────────────────────────────
app.get("/api/erc8004/status", async (c) => {
  try {
    const balance = await publicClient.readContract({
      address: IDENTITY_REGISTRY,
      abi: IDENTITY_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });
    if (Number(balance) === 0) return c.json({ registered: false, agent: account.address });

    const tokenId = await publicClient.readContract({
      address: IDENTITY_REGISTRY,
      abi: IDENTITY_ABI,
      functionName: "tokenOfOwnerByIndex",
      args: [account.address, 0n],
    });
    const uri = await publicClient.readContract({
      address: IDENTITY_REGISTRY,
      abi: IDENTITY_ABI,
      functionName: "tokenURI",
      args: [tokenId],
    });
    const clients = await publicClient.readContract({
      address: REPUTATION_REGISTRY,
      abi: REPUTATION_ABI,
      functionName: "getClients",
      args: [tokenId],
    });

    return c.json({
      registered: true,
      agent: account.address,
      tokenId: Number(tokenId),
      metadataURI: uri,
      reviewCount: clients.length,
    });
  } catch (error) {
    return c.json({ registered: false, agent: account.address, error: String(error) });
  }
});

// ─── ERC-8004: Register ──────────────────────────────────
app.post("/api/erc8004/register", async (c) => {
  const balance = await publicClient.readContract({
    address: IDENTITY_REGISTRY,
    abi: IDENTITY_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  if (Number(balance) > 0) return c.json({ error: "Agent already registered" }, 400);

  const { metadataURI } = await c.req.json().catch(() => ({ metadataURI: "" }));
  const tx = await withWriteLock(() =>
    walletClient.writeContract({
      address: IDENTITY_REGISTRY,
      abi: IDENTITY_ABI,
      functionName: "register",
      args: [metadataURI || ""],
    })
  );
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  return c.json({ success: true, txHash: tx, blockNumber: Number(receipt.blockNumber) });
});

// ─── Self Protocol: Agent Identity + Verification ────────
import { SelfAgent } from "@selfxyz/agent-sdk";
import { SelfBackendVerifier, DefaultConfigStore, AllIds } from "@selfxyz/core";

const selfAgent = new SelfAgent({ privateKey: PRIVATE_KEY });

const selfConfigStore = new DefaultConfigStore({
  minimumAge: 18,
});

const selfBackendVerifier = new SelfBackendVerifier(
  "agenthands-worker-verify",
  "https://agenthands-production.up.railway.app/api/self/verify",
  true,
  AllIds,
  selfConfigStore,
  "hex"
);

// In-memory registry of wallet addresses that completed Self verification.
// Survives process lifetime; on restart workers re-verify. For production
// you'd back this with Redis or a small DB.
const verifiedAddresses = new Map<string, number>(); // address (lowercase) → unix ms

function markAddressVerified(address: string) {
  if (!address) return;
  verifiedAddresses.set(address.toLowerCase(), Date.now());
}

app.get("/api/self/verified/:address", (c) => {
  const address = c.req.param("address")?.toLowerCase();
  if (!address) return c.json({ verified: false }, 400);
  const at = verifiedAddresses.get(address);
  return c.json({ verified: !!at, at: at ?? null, address });
});

app.get("/api/self/agent/status", async (c) => {
  try {
    const isRegistered = await selfAgent.isRegistered();
    const info = isRegistered ? await selfAgent.getInfo() : null;
    return c.json({ address: selfAgent.address, registered: isRegistered, info });
  } catch (error) {
    return c.json({ address: selfAgent.address, registered: false, error: String(error) });
  }
});

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

app.post("/api/self/verify", async (c) => {
  try {
    const body = await c.req.json();
    const { attestationId, proof, publicSignals, userContextData } = body;

    const result = await selfBackendVerifier.verify(
      attestationId,
      proof,
      publicSignals,
      userContextData || ""
    );

    const userAddr = result.userData?.userIdentifier;
    if (userAddr) markAddressVerified(userAddr);

    console.log(
      "✅ Self verification success:",
      userAddr,
      JSON.stringify(result.isValidDetails)
    );
    return c.json({
      status: "success",
      result: true,
      userIdentifier: userAddr,
      credentialSubject: result.discloseOutput,
    });
  } catch (error) {
    console.error("❌ Self verification failed:", String(error));
    return c.json({ status: "error", result: false, reason: String(error) });
  }
});

app.get("/api/self/agent/credentials", async (c) => {
  try {
    const creds = await selfAgent.getCredentials();
    const strength = await selfAgent.getVerificationStrength();
    return c.json({ credentials: creds, verificationStrength: strength });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// ─── IPFS: Upload (free — workers submit proof from the frontend) ───
app.post("/api/ipfs/upload", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) return c.json({ error: "No file provided" }, 400);

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

  const data = (await res.json()) as { IpfsHash: string; PinSize: number };
  return c.json({
    success: true,
    cid: data.IpfsHash,
    url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
    size: data.PinSize,
  });
});

// ─── Start ───────────────────────────────────────────────
const port = Number(process.env.PORT) || 3001;
console.log(`🤝 AgentHands Backend running on http://localhost:${port}`);
console.log(`🌿 Escrow chain: ${celoSepolia.name} (${celoSepolia.id}) — USDC @ ${USDC_ADDRESS}`);
console.log(`💰 x402 via thirdweb facilitator on ${X402_NETWORK_LABEL} — pay in USDC`);

export default { port, fetch: app.fetch };
