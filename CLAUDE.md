# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

AgentHands is a marketplace where AI agents post physical-world tasks (deliveries, inspections, verifications) and pay verified humans in USDC via smart-contract escrow. It targets **Celo mainnet only** (chain ID `42220`). There is no testnet deployment in active use.

Four independent workspaces, no monorepo tooling — each has its own lockfile and is installed/run separately:

| Path | Stack | Role |
|---|---|---|
| `contracts/` | Solidity 0.8.24, Foundry, OZ v5, UUPS | `AgentHands.sol` — escrow, task lifecycle, ratings, expiry. **Source of truth.** |
| `backend/` | Hono on Bun, single-file `index.ts` | x402-gated agent API, on-chain writes from the operator wallet, IPFS pinning, Self Protocol verification |
| `frontend/` | Next.js 16, React 19, wagmi v3, viem | Task marketplace dApp. Talks to the contract **directly** from the browser |
| `landing-page/` | Next.js 15, three.js WebGPU/TSL, GSAP | Marketing site. Serves `/skill.md` to AI agents |

Each of `contracts/`, `backend/`, and `frontend/` has its own `CLAUDE.md` with the detail that matters when working inside it. Read the relevant one before editing there.

## Architecture: who writes to the chain

This is the single most important thing to understand, because the README's diagram obscures it.

- **The frontend writes to the contract directly.** Every task-lifecycle write — `createTask`, `acceptTask`, `submitProof`, `approveTask`, `disputeTask`, `cancelTask`, `rateWorker`, `rateAgent` — is signed by the user's wallet in the browser. The backend is not in that path.
- **The backend is a sidecar, not a gateway.** It exists for three things the browser can't do: (1) x402-gated endpoints so autonomous agents can transact over plain HTTP, (2) IPFS pinning with a server-side Pinata JWT, (3) Self Protocol proof verification and the verified-address registry.
- **The backend's on-chain writes come from one operator wallet** (`PRIVATE_KEY`) and are serialized behind an in-process lock. See `backend/CLAUDE.md`.
- **Reads are decoupled from the wallet.** The frontend's task-read layer uses a standalone viem `publicClient` with a fallback transport, not the connected wallet's transport.

Off-chain integrations: Self Protocol (ZK human verification, backend-validated), ERC-8004 (agent identity + reputation registries, read-only from the frontend), Pinata/IPFS (proof storage), thirdweb (x402 facilitator), Chainlink (CELO/USD feed), CIP-64 (gas paid in USDC on MiniPay/Valora).

## Cross-cutting invariants

These break silently. Nothing type-checks them.

1. **`TaskStatus` numeric codes are ABI-stable.** `0 Open, 1 Accepted, 2 Submitted, 3 Completed, 4 Disputed, 5 Cancelled, 6 Expired`. The enum is mirrored by hand in `contracts/src/interfaces/IAgentHands.sol`, in `frontend/src/lib/utils/format.ts`, `frontend/src/components/TaskCard.tsx`, `frontend/src/components/SwipeCard.tsx`, and `frontend/src/app/tasks/[id]/page.tsx`. Never reorder.
2. **Errors and events are declared twice** — inline in `contracts/src/AgentHands.sol` *and* in `contracts/src/interfaces/IAgentHandsErrors.sol` / `IAgentHandsEvents.sol`. `AgentHands` does not inherit those interfaces. They are kept in sync by hand; change both.
3. **`frontend/src/hooks/useTaskEventWatcher.ts` hardcodes 11 event signatures** matched by topic hash. Changing an event signature in Solidity without updating that list silently stops cache invalidation.
4. **`frontend/src/config/index.ts` `STABLECOINS` array order is load-bearing** — index-mapped to `useReadContracts` results. Reordering misaligns every balance.

## Commands

There is no root-level build or test. `package.json` at the root is vestigial (its `test` script exits 1; its `ethers`/`dotenv` deps are unused). Work inside a workspace.

```bash
# contracts — Foundry
cd contracts && forge test -vv           # full suite (~84 tests, 8 files)
forge test --match-test test_CreateTask -vvv   # single test
forge test --match-path test/unit/Ratings.t.sol # single file
forge build --sizes && forge fmt --check       # what CI runs

# backend — Bun, no build step, no tests
cd backend && bun install && bun run index.ts
bun --hot index.ts                       # hot reload

# frontend — Bun + Next 16, no test suite
cd frontend && bun install && bun dev     # :3000
bun run build                             # Turbopack; also type-checks
bun run lint

# landing-page — Bun + Next 15, Node 24 required (.nvmrc)
cd landing-page && bun install && bun dev
```

Package manager is **Bun** everywhere. `landing-page/` also carries a stray `package-lock.json`; ignore it, `vercel.json` pins `npm run build` only for Vercel.

## Mainnet safety

The UUPS proxy `0xADA0466303441102cb16F8eC1594C744d603f746` is **live on Celo mainnet with thousands of real transactions and real user funds in escrow.**

- **Never run any script that broadcasts a transaction** — `make deploy`, `make upgrade`, `make set-fee`, `make set-token`, or any `forge script --broadcast` — unless the user explicitly asks for that exact command in that message. Prior approval does not carry over.
- **Never touch the operator wallet** (`backend/.env` `PRIVATE_KEY`) or initiate anything that spends from it.
- Before proposing any contract upgrade, read the storage-layout rules in `contracts/CLAUDE.md`. There is no `__gap`, and slot 0 is occupied by an inherited non-upgradeable `ReentrancyGuard`.

`.env` files are correctly gitignored; only `.env.example` files are tracked. Keep it that way.

## Documentation convention (required)

The codebase applies a uniform JSDoc/NatSpec convention, maintained deliberately across a long run of `docs(natspec): …` commits. **Follow it for every new export.**

**TypeScript** (`frontend/`) — file-level `@module` banner, then `@since` on every exported symbol:

```ts
/** @module useCeloUsdPrice — Chainlink CELO/USD price feed hook for Celo mainnet balance conversion. */

/**
 * Shape of the value returned by `useCeloUsdPrice` on Celo mainnet.
 * @since 1.0.0
 */
export interface CeloUsdPriceResult { /* each field carries its own doc comment */ }
```

Rules: `@module` one-liner at the top of every file (config/util files may use a multi-line block listing addresses). `@since 1.0.0` on every exported function, component, hook, type, interface, prop field, and notable constant. `@param`/`@returns` written as prose that names the concrete domain semantics, not the type. `@see` to cross-link sibling symbols, with the literal address when referring to a deployed contract. `@example` on utilities.

**Solidity** (`contracts/`) — `///` triple-slash on every contract, enum, struct, event, error, and function. `@notice` for the user-facing statement, `@dev` for mechanism, `@param` for every argument. `@dev` blocks are expected to explain the Celo/MiniPay/x402/CIP-64 rationale and to spell out fee arithmetic with a worked USDC example, as `approveTask` does.

Comments here restate domain reasoning, not types. Match that density.

## Known traps

Documented, not fixed. Trust the code over these documents.

- **`backend/README.md`'s route table is wrong.** It lists `/api/tasks`, `/health`, `/accepts`, `/facilitator/verify`, `/api/tasks/:id/accept`, `/api/tasks/:id/submit` — **none exist.** The real prefix is `/api/agent/tasks`; the root `README.md` is the accurate one. Worker accept/submit are on-chain browser actions, not endpoints.
- **`backend/.env.example` omits `THIRDWEB_SECRET_KEY`**, which the server requires — it calls `process.exit(1)` without it. `cp .env.example .env` produces a config that cannot boot. It also documents five variables the code never reads.
- **`contracts/.github/workflows/test.yml` never runs.** GitHub Actions only reads workflows from the repo root. The live workflows are `.github/workflows/contracts-{test,lint}.yml`, which use the default Foundry profile — so `[profile.ci]` (`fuzz.runs = 256`) is never exercised. No fuzz tests exist anyway.
- **`contracts/docs/testing.md` describes a shared `AgentHandsTest` base contract** with `deployProxy()`, `mintAndApprove()`, `createDefaultTask()` helpers. None of it exists; every test file copy-pastes its own `setUp()`.
- **`contracts/.env.example` sets `USDC_MAINNET` to `0x765DE81…`**, which is Mento cUSD/USDm, not USDC — and `Deploy.s.sol` reads `USDC_ADDRESS`, a variable the example never defines.
- **`frontend/README.md` documents four env vars the code never reads** (`NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_AGENTHANDS_ADDRESS`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_RPC_URL`). The real ones are `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_PROJECT_ID`; the contract address is hardcoded.
- **`landing-page/README.md` claims Tailwind + PostCSS.** Neither is present — it's CSS Modules. Its shaders are three.js **TSL nodes**, not GLSL, running on a **WebGPU** renderer with a WebGL fallback.
- **The agent-facing skill doc exists in three places.** `landing-page/public/skill.md` and `frontend/public/skill.md` are byte-identical (577 lines, canonical, served at `/skill.md`). `skills/agenthands/SKILL.md` is a shorter 181-line reference that has already drifted (it points at `agenthands.xyz`, a domain used nowhere else). Updating agent docs means touching all three. `skills/agenthands/SKILL.md` has no YAML frontmatter, so it is **not** a loadable Claude Code skill despite its path.
- **`landing-page/src/data/skillContent.js` is dead and testnet-stale** — exported, imported nowhere, and it contradicts the canonical mainnet `skill.md`.
