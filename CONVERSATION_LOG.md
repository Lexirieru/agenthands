# AgentHands — Conversation Log

**Human:** Axel Urwawuska Atarubby (@lexirieru) — UGM student, solo developer
**Agent:** MyCelo — Claude Opus via OpenClaw (hackathon assistant)
**Date:** March 22, 2026 (~13:00–23:40 UTC, one continuous session)
**Duration:** ~11 hours of active collaboration

---

## Phase 1: Ideation & Registration (~12:30–13:00 UTC)

**Human:** Registered for The Synthesis hackathon. Asked MyCelo to help brainstorm project ideas for Base Batches 003.

**Agent:** Researched hackathon tracks, prize catalog, and available integrations (x402, ERC-8004, Self Protocol). Proposed several concepts. Together we settled on **AgentHands** — "a marketplace where AI agents hire humans for physical-world tasks."

**Key decision (human-led):** Axel chose the AgentHands concept because it flips the typical AI narrative — instead of AI replacing humans, AI *hires* humans. Axel also decided on dual-chain deployment (Base + Celo) to maximize track eligibility.

**Agent action:** Completed hackathon registration via API, received participant ID and API key. Auto-created solo team.

---

## Phase 2: Architecture & Smart Contract (~13:15–13:50 UTC)

**Agent:** Designed the full architecture:
- UUPS upgradeable proxy (OpenZeppelin v5.6.1)
- Task lifecycle: Open → Accepted → Submitted → Completed/Disputed/Cancelled/Expired
- USDC escrow with 2.5% platform fee
- Dual-chain: Base Sepolia + Celo Sepolia (same proxy address via CREATE2)
- Rating system (1-5 stars, both directions)

**Agent action:** Wrote `AgentHands.sol` from scratch — 300+ lines of Solidity including escrow, dispute resolution, expiry protection (3 cases), and ratings. Wrote 12 Foundry tests, all passing.

**Human:** Provided GitHub fine-grained token for the agent to push code autonomously.

**Agent action:** Initialized repo, pushed initial structure and contracts.

```
Commit: 7f60746 — 🔨 contracts: AgentHands escrow + tests (12/12 passing)
```

**Agent:** Upgraded to UUPS proxy pattern, added 3 more tests.

```
Commit: 5018a13 — 🔒 contracts: UUPS upgradeable + OpenZeppelin v5 (15/15 tests passing)
```

---

## Phase 3: Deployment to Both Chains (~13:50–14:10 UTC)

**Agent:** Wrote Foundry deploy script. Deployed to Base Sepolia and Celo Sepolia with deterministic addresses. Set USDC (Base) and cUSD (Celo) as allowed payment tokens.

```
Proxy: 0xADA0466303441102cb16F8eC1594C744d603f746 (same on both chains)
Commit: eb9edc1 — 🚀 deploy: Base Sepolia + Celo Sepolia testnet (UUPS proxy)
```

---

## Phase 4: Frontend Build (~14:10–15:00 UTC)

**Agent:** Built complete Next.js 16 frontend with:
- wagmi v3 + Reown AppKit for wallet connection
- TanStack React Query for data fetching
- 6 pages: home, tasks list, task detail, create task, dashboard, skills.md
- Multi-chain support with chain badges and network switching

**Debugging moment:** Reown AppKit modal wouldn't auto-close after network switch. Agent tried multiple approaches, eventually built a custom `NetworkSwitch` dropdown component that solved it.

**Another issue:** `useBalance` in wagmi v3 doesn't support custom ERC-20 tokens via `token` param anymore. Agent switched to `useReadContract` with direct `balanceOf` calls.

```
Commits: 5679b5e → 4d7ba86 (multiple iterations)
```

---

## Phase 5: Backend + Integrations (~14:30–15:30 UTC)

### x402 Micropayments ✅
**Agent:** Integrated `@x402/hono` for HTTP 402 payment-gated endpoints. AI agents pay micro-fees in USDC to use the API (create task: $0.01, approve/dispute/rate: $0.001).

**Debugging:** Initial import used `paymentMiddleware` but the actual export is `paymentMiddlewareFromConfig` — different API signature. Agent read the source to fix.

```
Commit: b7a11e6 — 💰 x402 micropayments
```

### Self Protocol (ZK Human Verification) ✅
**Agent:** Integrated Self Protocol for worker identity verification. Workers scan a QR code with the Self app to prove they're real humans via zero-knowledge proofs.

**Issue encountered:** `@selfxyz/qrcode` component crashes on localhost (tries to access `window` during SSR). Agent built a fallback: button-based flow for local dev, QR for production.

**Multiple debugging iterations:** `InvalidIdentityCommitmentRoot()` error on testnet — Merkle root not synced. Tried 4 different approaches to fix scope hash matching. Human (Axel) also worked on this from their side.

```
Commits: b4364e4 → 6584807 (6 commits of Self Protocol debugging)
```

### ERC-8004 Agent Identity ✅
**Agent:** Added `AgentBadge` component that reads ERC-8004 Identity Registry and Reputation Registry on Celo Sepolia. Shows verified/unverified status on task detail pages.

```
Commit: b4364e4 — 🛡️ Self Protocol + 🆔 ERC-8004
```

### IPFS Proof Storage ✅
**Agent:** Set up Pinata IPFS for task completion proofs. Workers upload photos → stored on IPFS → CID recorded on-chain.

---

## Phase 6: On-Chain End-to-End Testing (~15:20–15:35 UTC)

**Agent:** Created test task on Base Sepolia: "Verify coffee shop exists at Jl. Malioboro" (10 USDC).

**Human:** Connected wallet (`0xfa128bbD...`), accepted the task, submitted proof with IPFS CID.

**Agent:** Approved task on-chain → payment released:
- Worker received: 9.75 USDC (97.5%)
- Platform fee: 0.25 USDC (2.5%)

**Result:** Full task lifecycle verified end-to-end. ✅

---

## Phase 7: Full UI Rework (~16:30–17:10 UTC)

**Human (decision):** Found oneagentlabor design reference and wanted the warm, premium aesthetic applied to AgentHands.

**Agent:** Complete UI rewrite — 800+ line home page with:
- GSAP ScrollTrigger animations throughout
- Warm color scheme (#FFFAF5 bg, #FF8C42 accent)
- Rotating hero text, feature pills, concentric circles background
- "Connect Your Agent" modal with copy-paste skill.md
- How-it-works cards, stats strip, tech stack grid
- Custom wallet button (replaced Reown default)

```
Commit: 40d578a — 🎨 FULL UI REWORK
```

---

## Phase 8: Landing Page (~18:30–19:30 UTC)

**Human:** Built the landing page separately with Three.js shaders and GSAP animations.

**Agent:** Assisted with color alignment, font matching (Parasitype + Courier New), and adding role-selection buttons ("I'm an Agent" / "I'm a Human") with skill.md copy panel and Self Protocol KYC panel.

```
Commits: 9816199 → 90aa08c
```

---

## Phase 9: Contract Upgrade + Expiry Protection (~20:00 UTC)

**Agent:** Added `claimExpired()` function to handle stuck funds:
- Case 1: Nobody accepted → full refund to agent
- Case 2: Worker accepted but never submitted → full refund to agent  
- Case 3: Worker submitted but agent ghosted (7 days) → auto-approve to worker

Upgraded implementation on both chains. Added 4 new tests (now 19/19 passing).

```
Commit: 9c2aa33 — ⏰ claimExpired: auto-refund/auto-approve
```

---

## Phase 10: Deployment & Polish (~20:30–23:00 UTC)

**Agent:** Updated all URLs to deployed domains after Vercel + Railway deploy:
- Landing: https://agenthands.vercel.app
- Frontend: https://app-agenthands.vercel.app  
- Backend: https://agenthands-production.up.railway.app

**Agent:** Wrote comprehensive README with architecture diagram, contract addresses, integration docs, and getting started guide.

**Human + Agent:** Multiple rounds of Self Protocol debugging to get QR verification working in production.

---

## Phase 11: Multi-Chain Testing (~22:30–23:40 UTC)

**Agent:** Created and managed tasks on Celo Sepolia to verify dual-chain functionality:
- Task #3: Created, worker accepted + submitted, agent approved → payment released ✅
- Task #4: Created "Photo your window view", worker submitted proof, agent approved ✅

**Human:** Pulled latest code, confirmed frontend cache invalidation fix.

---

## Summary of Collaboration

| Aspect | Who |
|--------|-----|
| **Concept & direction** | Human (Axel) |
| **Architecture design** | Agent (MyCelo) |
| **Smart contracts** | Agent — 100% written by agent |
| **Frontend (app)** | Agent — 100% written by agent |
| **Landing page** | Human — designed & built, agent assisted with integration |
| **Backend API** | Agent — 100% written by agent |
| **x402 integration** | Agent |
| **Self Protocol** | Both — agent integrated, human debugged QR flow |
| **ERC-8004** | Agent |
| **UI design direction** | Human (chose reference design) |
| **UI implementation** | Agent (GSAP, warm theme, all components) |
| **Testing & QA** | Both — agent created tasks, human tested from wallet |
| **Deployment** | Both — agent configured, human managed Vercel/Railway |
| **Git operations** | Agent — all commits pushed autonomously |

**Total commits:** 40+
**Total tests:** 19/19 passing
**Lines of code:** ~5000+ (contracts + frontend + backend)
**Chains:** 2 (Base Sepolia + Celo Sepolia)
**Integrations:** 5 (x402, Self Protocol, ERC-8004, IPFS/Pinata, Reown AppKit)
