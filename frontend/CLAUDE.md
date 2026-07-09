# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Next.js 16.2.1 (App Router) · React 19.2.4 · wagmi 3.5 · viem 2.47 · TanStack Query 5.94 · Tailwind v4 · Bun. The AgentHands task marketplace dApp, Celo mainnet only (chain ID 42220). See the repo-root `CLAUDE.md` for how this fits with `contracts/` and `backend/`.

## This is NOT the Next.js you know

Next 16 has breaking changes — APIs, conventions, and file structure may all differ from your training data. **Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.** Heed deprecation notices. (`AGENTS.md` carries this same warning for other tools.)

Concretely, already visible in this codebase:

- **Request APIs are async.** `headers()` is awaited in `app/layout.tsx:71`.
- **Dynamic route `params` is a Promise.** `app/tasks/[id]/page.tsx:70` unwraps it with React 19's `use(params)`. Treating it as a plain object will break.
- **Turbopack is the default bundler** (`next.config.ts:10`). A `webpack()` override also exists — externalizing `pino-pretty`, `lokijs`, `encoding` for WalletConnect — and applies only to non-Turbopack builds. The two coexist.

## Commands

```bash
bun install
bun dev            # :3000
bun run build      # Turbopack; also type-checks
bun run lint       # eslint flat config (eslint.config.mjs)
```

There is no test suite. `bun run build` is the type-check gate.

## Architecture: the browser owns the chain

**Every task-lifecycle write is signed by the user's wallet, in the browser, straight to the contract** — `createTask`, `approve` (USDC), `acceptTask`, `submitProof`, `approveTask`, `disputeTask`, `cancelTask`, `rateWorker`, `rateAgent`. All reads too: multicall, balances, ratings, Chainlink, ERC-8004.

The backend is touched in exactly **three places**, all via `NEXT_PUBLIC_API_URL` (each with a hardcoded Railway fallback):

1. `components/ProofUpload.tsx:145` — `POST /api/ipfs/upload` (Pinata pinning; the JWT stays server-side)
2. `lib/utils/verification.ts:30` — `GET /api/self/verified/:address`
3. `components/SelfVerify.tsx:122` — the Self SDK's `endpoint`, which the ZK relayer POSTs proofs to

The contract is the source of truth. The backend is an IPFS-pinning and identity sidecar.

## Web3 wiring

- **Config** (`src/config/index.ts:109`): single chain `celo`; connectors `injected()` (MiniPay / Valora / MetaMask) + `walletConnect()`; `storage: cookieStorage`, `ssr: true`.
- **Provider tree** (`src/context/index.tsx`): `WagmiProvider` (rehydrated from `cookieToInitialState`, passed down from the server layout) → `QueryClientProvider` → `AppBoot` → children. `AppBoot` runs `useAutoConnect()` and `useTaskEventWatcher()` once inside provider scope.
- **`AGENTHANDS_ADDRESS` is hardcoded**, not an env var (`config/index.ts:25`).
- **Two independent read clients.** wagmi's transport backs `useReadContract(s)`; the task-read layer uses its **own module-level viem `createPublicClient` with `fallback([http(), http(forno)])`** (`hooks/useTasks.ts:36`, again in `useTaskEventWatcher.ts:70`), deliberately decoupled from the connected wallet.
- **ABIs** (`src/abi/*.json`) are bare JSON arrays, not `{abi:[…]}` wrappers. `AgentHands.json` is forge output. `IdentityRegistry.json` / `ReputationRegistry.json` are hand-trimmed to just the functions `AgentBadge` needs.

## Server/client boundary

Exactly **two server components**: `app/layout.tsx` (async, `await headers()`) and `app/page.tsx` (`redirect("/tasks")`). Everything else is `"use client"`. **No middleware, no `route.ts` handlers, no server actions.** (`next.config.ts` declares `serverActions.allowedOrigins`, but none exist.)

Because wagmi runs with `ssr: true`, **SSR-safety is mandatory and easy to miss.** Client-only hooks return `null`/`false` on first render (`useIsMiniPay`, `useIsMobile`) and pages gate rendering on a `mounted`/`isMounted` flag (`Header.tsx:91`, `tasks/page.tsx:116`) to avoid hydration mismatch. Follow that pattern in anything that reads `window`.

Routes: `/` → redirect · `/tasks` (mobile `SwipeStack` vs desktop `TaskGrid`, hard-split on `useIsMobile()`) · `/tasks/[id]` (all 7 write actions) · `/tasks/new` (two-step approve→createTask) · `/dashboard` · `/search`.

`ResponsiveShell` is the layout switcher: mobile gets `SwipeNav` (horizontal gesture router) + `NavBar`; desktop gets a plain `<main>`. Their tab order routes to `/`, not `/tasks`; `/tasks` is normalized back to `/` for active-tab highlighting.

## CIP-64: gas paid in USDC

`useCip64()` (`hooks/useCip64.ts:33`) returns `{ feeCurrency: USDC_FEE_ADAPTER, type: "cip64" }` **only when** `window.ethereum.isMiniPay || isValora`, and `{}` otherwise. Callers spread it into every write:

```ts
writeContract({ ...args, ...cip64 } as never)
```

That empty-object spread **is** the entire fallback: on MetaMask/Rainbow/desktop it contributes nothing and gas is paid in native CELO via standard EIP-1559. Sending `type:'cip64'` to a non-Celo-native wallet gets the transaction rejected, which is why it's gated on wallet detection. `tasks/new/page.tsx:271` surfaces the distinction to the user.

Note: CIP-64 is frontend-only. The backend's operator wallet pays gas in CELO.

## Four things that must stay in lockstep with Solidity

Nothing type-checks these. They fail silently.

1. **`TaskStatus` 0–6** is duplicated in `lib/utils/format.ts:180`, `components/TaskCard.tsx:52`, `components/SwipeCard.tsx:61`, and `app/tasks/[id]/page.tsx:33`.
2. **`useTaskEventWatcher.ts:13` hardcodes 11 event signatures**, matched by topic hash. A changed event signature silently stops all cache invalidation.
3. **`config/index.ts:64` `STABLECOINS` array order is index-mapped** to `useReadContracts` results (0=USDC, 1=USDT, 2=USDm). Reordering misaligns every balance.
4. Token decimals: USDC/USDT = 6, USDm/CELO = 18.

## Hooks worth knowing

- `useAllTasks()` (`useTasks.ts:131`) — `taskCount` then a viem multicall over `getTask(1..n)`, `allowFailure`, drops `HIDDEN_TASK_IDS = {"1","2"}`, polls 8 s.
- `useTaskDetail(id)` — single `getTask`, polls 6 s, **no hidden filter** so direct links resolve.
- `useInvalidateTasks()` — returns `patchDetail`, which optimistically merges into both detail and list caches to dodge stale-RPC flicker after a write.
- `useTaskEventWatcher()` — one module-flag-guarded `watchContractEvent` (4 s poll) that invalidates task keys plus wagmi's `["readContract"]`/`["readContracts"]` on any log. Errors are swallowed; the 8 s poll is the safety net.
- `useStablecoinBalances(address, {includeCelo})` — batched `useReadContracts`; order-sensitive (see above).
- `useCeloUsdPrice(enabled)` — Chainlink CELO/USD; treats an answer older than 1 h as stale and returns `price: null`.
- `useAutoConnect()` — connects the injected connector on mount, because MiniPay and Valora don't auto-connect.

## Dead code — do not assume it's wired

- **`hooks/useAgentHands.ts`**: only `useStablecoinBalances` is imported anywhere. All nine write wrappers (`useCreateTask`, `useAcceptTask`, …) and the read wrappers are unused — pages call `useWriteContract()` and the viem layer directly. Follow the pages, not these.
- **`hooks/useTaskFilter.ts`** — unused; pages inline the same logic.
- **`components/AgentBadge.tsx`** — fully built (reads ERC-8004 Identity + Reputation registries, addresses in `config/erc8004.ts`) but **commented out at its only call site**, `tasks/[id]/page.tsx:298`. Dormant, not broken.

## Conventions

Components `PascalCase.tsx`, default-exported, filename matches. Hooks `useX.ts`, named-export. Path alias `@/*` → `src/*`. TypeScript `strict`. Addresses typed `` `0x${string}` ``. wagmi/viem type friction is papered over with `as never` on `writeContract` calls and one `@ts-expect-error` on the multicall (`useTasks.ts:84`) — match the surrounding file rather than fighting it.

`src/types/task.ts` holds the single `TaskData` interface mirroring the Solidity struct: `bigint` for every `uint256`, except `status`, which `fetchAllTasks` coerces to `number` so it works in a `switch`.

Money formatting lives in `lib/utils/format.ts`. `formatTokenAmount` does pure BigInt division — **never introduce floats into amount math.** `formatRewardDisplay` prefixes `$` for stablecoins and suffixes ` CELO` for volatile tokens. The dollar rule (repeated in `Header.tsx:66` and `DollarsCard.tsx:42`): `≥ $1` → 2 decimals; micro-amounts → `toFixed(6)` with trailing zeros stripped.

Styling is **Tailwind v4** (`@import "tailwindcss"` in `globals.css`, no `tailwind.config`, no shadcn). Design tokens are CSS variables in `:root` — a warm-brown palette exposed to Tailwind via `@theme inline`. Brand hex (`#5C2D0A`, `#8B4513`, `#D4700A`) is also hardcoded in many components. Fonts via `next/font/local`: **Parasitype** display + **Courier New** body/mono. Icons `lucide-react`. Animation: Framer Motion on mobile, GSAP (`gsap.context` for scoped cleanup) on desktop.

## Doc comments are required

Every new export gets the house JSDoc convention (see root `CLAUDE.md`). Reference implementation, `hooks/useCeloUsdPrice.ts`:

```ts
/** @module useCeloUsdPrice — Chainlink CELO/USD price feed hook for Celo mainnet balance conversion. */

/**
 * Shape of the value returned by `useCeloUsdPrice` on Celo mainnet.
 * @since 1.0.0
 */
export interface CeloUsdPriceResult { /* each field carries its own doc comment */ }
```

`@module` one-liner atop every file. `@since 1.0.0` on every exported function, component, hook, type, interface, prop field, and notable constant. `@param`/`@returns` as prose naming the domain semantics ("1-based uint256 task ID assigned by `createTask`"), not the type. `@see` cross-links siblings, with the literal address when pointing at a deployed contract. `@example` on utilities. Every enum-mapping block carries a "must stay in sync with `AgentHands.sol`" warning. Comments here restate domain reasoning; match that density.

## Traps

- **`README.md` documents four env vars the code never reads**: `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_AGENTHANDS_ADDRESS`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_RPC_URL`. The real ones are **`NEXT_PUBLIC_API_URL`** and **`NEXT_PUBLIC_PROJECT_ID`**; the contract address is hardcoded and the RPC is viem's `celo` default with no env override. The README also mislabels `SwipeNav` as accept/skip buttons (it's a route swiper) and `AgentBadge` as ENS-based (it's ERC-8004).
- Only `NEXT_PUBLIC_*` vars reach the client, and they are inlined at compile time.
- `SelfVerify`'s JSDoc says it polls `/api/self/verify`. It actually polls `/api/self/verified/:address`. The behavior is right; the comment names the wrong path. **Verification status comes from the backend, never localStorage** — users could fake localStorage. The only localStorage use in the app is `ProofUpload`'s per-task draft persistence.
- `public/skill.md` is byte-identical to `landing-page/public/skill.md`. There is no shared source; both must be edited together.
