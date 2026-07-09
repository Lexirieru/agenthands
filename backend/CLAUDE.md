# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Hono server on Bun. Everything lives in one file: `index.ts` (~998 lines). No database, no build step, no tests. Deployed on Railway. See the repo-root `CLAUDE.md` for how this fits with `contracts/` and `frontend/`.

## Do not trust `README.md`

Its route table lists `/api/tasks`, `/health`, `/accepts`, `/facilitator/verify`, `/api/tasks/:id/accept`, and `/api/tasks/:id/submit`. **None of those exist.** The real prefix is `/api/agent/tasks`. Worker accept/submit are on-chain browser actions, not endpoints. Read the code, or the table below.

## Commands

```bash
bun install
bun run index.ts        # :3001 by default (PORT)
bun --hot index.ts      # hot reload
```

`cp .env.example .env` **will not boot.** The template omits `THIRDWEB_SECRET_KEY`, which the server requires — it calls `process.exit(1)` without it. See the env table below.

## What this server is for

The frontend writes to the contract directly from the user's wallet. This server exists for the three things a browser can't do:

1. **x402-gated endpoints**, so an autonomous AI agent can create/approve/dispute/rate tasks over plain HTTP with a payment header instead of a wallet UI.
2. **IPFS pinning** with a server-side Pinata JWT that must never reach the client bundle.
3. **Self Protocol** proof verification and the verified-address registry.

Everything on-chain is signed by a single operator wallet (`PRIVATE_KEY`) using viem. The thirdweb client is used *only* for x402 verification, never for writes.

## Route table (authoritative)

Registered on one Hono app (`:484`) with wide-open CORS (`:485`). **No authentication anywhere.** x402 is the only access control, and it guards four routes.

| Method | Path | x402 | Price | Line |
|---|---|---|---|---|
| GET | `/` | — | free | `:488` — the only health route; there is no `/health` |
| POST | `/api/agent/tasks` | **yes** | `reward + 1000` atomic (`$0.001`) | `:519` |
| POST | `/api/agent/tasks/:id/approve` | **yes** | `1000` | `:653` |
| POST | `/api/agent/tasks/:id/dispute` | **yes** | `1000` | `:676` |
| POST | `/api/agent/tasks/:id/rate` | **yes** | `1000` | `:699` |
| GET | `/api/agent/tasks` | — | free | `:758` |
| GET | `/api/agent/tasks/:id` | — | free | `:726` |
| POST | `/api/notify/:id` | — | free | `:741` |
| POST | `/api/agent/tasks/:id/webhook` | — | free | `:749` |
| GET | `/api/erc8004/status` | — | free | `:780` |
| POST | `/api/erc8004/register` | — | free | `:822` — on-chain write, unauthenticated |
| GET | `/api/self/verified/:address` | — | free | `:873` |
| POST | `/api/self/verify` | — | free | `:921` |
| GET/POST | `/api/self/agent/{status,register,register/status,credentials}` | — | free | `:880`–`:953` |
| POST | `/api/ipfs/upload` | — | free | `:964` |

## The x402 gate

Not Hono middleware. `requirePayment(c, opts)` (`:292`) is called by hand inside each handler; it returns a `Response` to short-circuit, or `null` to continue. It accepts a `PAYMENT-SIGNATURE` or `X-PAYMENT` header.

**Validation runs before the charge — preserve this.** In `createTask`, every field, reward, deadline, token, and `parseUnits` check (`:522`–`:561`) happens before `requirePayment` (`:571`). In `rate`, the 1–5 score is checked (`:704`) before the charge (`:706`). A malformed request must never burn the agent's fee.

Settlement is deliberately **two-step, not `settlePayment`**:

1. `verifyPayment` off-chain (`:356`) validates the EIP-3009 signature, expiry, `payTo`, and asset. A non-200 forwards the 402 + accepts body verbatim (`:366`).
2. The server **broadcasts the transfer itself** (`:379`–`:444`): `decodePayment` → split the 65-byte signature into r/s/v (`:408`) → `writeContract('transferWithAuthorization', …)` under the write lock → `waitForTransactionReceipt`.

Step 2 exists because thirdweb's bundler/paymaster errors with "Mainnets not enabled". A consequence: **this path pays gas in native CELO.** There is no CIP-64 here — CIP-64 is frontend-only. The operator wallet must hold CELO, despite the "everything settles in USDC" narrative.

`requirePayment` also reconstructs the resource URL from `x-forwarded-proto`/`host` (`:313`) because Railway terminates TLS and the signed URL must match.

## On-chain writes and the write lock

`account = privateKeyToAccount(PRIVATE_KEY)` (`:254`), viem `publicClient`/`walletClient` on `chain: celo` (`:255`).

**Every write goes through `withWriteLock` (`:107`).** There is no explicit nonce management — correctness depends entirely on that in-process mutex serializing viem's auto-nonce, and each critical section awaits its receipt. `createTask` holds the lock across `approve` + `createTask` + receipt, so throughput is roughly one confirmed transaction at a time. **Any new write must be wrapped in the lock.**

`createTask` reads `TaskCreated.taskId` from `parseEventLogs` rather than calling `taskCount()` afterwards (`:612`) — a deliberate dodge of RPC eventual consistency. Keep it.

`describeContractError` (`:507`) regex-extracts the revert reason and truncates to 240 chars; handlers return `400 {error, reason}`.

## In-memory state — dies on restart, breaks on scale-out

Three maps and a lock, all process-local:

- `webhooks` (`:460`) — taskId → URL. Lost on restart.
- `verifiedAddresses` (`:866`) — the Self Protocol registry. **Lost on restart; workers must re-verify.** The code comment says as much and suggests Redis or a small DB for production.
- `writeLock` (`:107`) — **per-process only.** Two instances sharing one `PRIVATE_KEY` will race on nonces and drop transactions.

`account`, `walletClient`, `selfAgent`, and `twFacilitator` are all singletons keyed to one operator wallet. **This server is not horizontally scalable as written.** Do not deploy a second replica without solving nonce coordination and moving those maps out of process.

## Self Protocol

`SelfBackendVerifier` (`:854`) is constructed with scope `"agenthands-worker-verify"` and its callback endpoint **hardcoded to the Railway production URL** — Self's scope binding will mismatch on any local or alternate deployment. The third constructor argument is `true`, which is **mockPassport / dev mode**: it accepts mock and test passports and is not production-hardened.

`selfAgent = new SelfAgent({ privateKey: PRIVATE_KEY })` (`:848`) reuses the operator key as the Self agent key.

`POST /api/self/verify` marks `result.userData.userIdentifier` verified; `GET /api/self/verified/:address` is what the frontend polls. Note `/verify` returns **HTTP 200 even on failure**, with `{status:"error", result:false}` in the body.

## Webhooks

`notifyAgent(taskId, status, proofCID)` (`:462`) POSTs `{event:"task_status_changed", …}`. **Its only trigger is `POST /api/notify/:id`** (`:741`) — no on-chain event listener exists, and the approve/dispute/rate handlers never call it. The root README's "near real-time" webhook claim is aspirational. There is no timeout, no retry, no backoff; a hanging webhook URL blocks the request.

## Environment variables

Read in code — required unless noted:

| Var | Line | Notes |
|---|---|---|
| `PRIVATE_KEY` | `:32` | operator wallet |
| `AGENTHANDS_ADDRESS` | `:33` | proxy |
| `WALLET_ADDRESS` | `:34` | becomes `PAY_TO` |
| `THIRDWEB_SECRET_KEY` | `:35` | **missing from `.env.example`** |
| `PINATA_JWT` | `:36` | optional; unset ⇒ uploads send `Bearer undefined` |
| `USDC_ADDRESS` | `:37` | defaults to Celo mainnet |
| `USDT_ADDRESS` | `:41` | defaults |
| `CELO_RPC` | `:71` | defaults to forno |
| `PORT` | `:993` | |

`.env.example` additionally documents `BASE_SEPOLIA_RPC`, `CELO_SEPOLIA_RPC`, `PINATA_API_KEY`, `PINATA_SECRET`, and `X402_FACILITATOR_URL` — **all five are dead**; no code reads them. No external facilitator URL is used; `twFacilitator` is built locally from `{client, serverWalletAddress: PAY_TO}`.

## Conventions

Manual `if` validation — **no zod** (not a dependency). `uuid` is a listed dependency but unused; `dotenv/config` is imported although Bun auto-loads `.env`. Responses are `{success: true, …}` or `{error, reason?}`.

Add doc comments to every new export per the repo-wide NatSpec convention (see root `CLAUDE.md`): `@module` at the top of a file, `@since 1.0.0` on exports, `@param`/`@returns` in prose that names domain semantics.

## Traps and latent bugs

- **`CELO_RPC` double-fallback is a copy-paste bug** (`:71`): `optionalEnv("CELO_RPC", optionalEnv("CELO_RPC", "https://forno.celo.org"))`. Both reads name the same variable; the intended legacy alias is lost.
- **Unauthenticated abuse surface.** Anyone can overwrite the webhook URL for any task (`:749`), POST a spoofed status/proofCID to a registered webhook (`:741`), or trigger operator-wallet actions via `/api/erc8004/register` (`:822`) and `/api/self/agent/register` (`:890`).
- **`BigInt(c.req.param("id"))` sits outside the try/catch** in approve and dispute (`:654`, `:677`) — a non-numeric id throws a 500.
- **`GET /api/agent/tasks`** (`:758`) loops `getTask` for every id with no pagination — unbounded sequential RPC.
- **The boot fingerprint logs the last 4 characters of `THIRDWEB_SECRET_KEY`** and other secrets (`:78`).
- Status codes are inconsistent: an x402 verify throw returns 500 even for client-side problems (`:360`); a malformed payload returns 402 (`:405`); most contract failures return 400.
- Variable shadowing: outer `approveTx` (`:581`) vs inner (`:593`). Works, but confusing.
