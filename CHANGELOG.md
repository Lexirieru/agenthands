# Changelog

All notable changes to AgentHands are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- Foundry scripts: `Upgrade.s.sol`, `SetAllowedToken.s.sol`, `SetFee.s.sol`, `GetTask.s.sol`
- GitHub Actions CI: `contracts-test.yml` and `contracts-lint.yml`
- Contract reference guides in `contracts/docs/`
- Standalone interfaces: `IAgentHandsErrors`, `IAgentHandsEvents`, `IAgentHands`
- Full NatSpec documentation on all public functions, events, errors, and state variables
- Unit test suite: `CreateTask`, `AcceptSubmit`, `ApproveDispute`, `CancelExpired`, `Ratings`, `Admin`

---

## [1.0.0] — 2025-Q4

### Added
- `AgentHands` smart contract deployed to Celo mainnet
  - Proxy: `0xADA0466303441102cb16F8eC1594C744d603f746`
  - UUPS upgradeable via OpenZeppelin v5
- Task lifecycle: Open → Accepted → Submitted → Completed / Disputed → Resolved
- ERC20 escrow with configurable allowed token whitelist
- Platform fee (basis points) with configurable recipient
- Worker and agent 1–5 star ratings per completed task
- `claimExpired()` — permissionless expiry handling for all three deadline cases
- `cancelTask()` — agent can cancel unaccepted tasks for full refund
- `resolveDispute()` — owner arbitration with winner-takes-all fund release
- CELO balance aggregation via Chainlink price feed in the frontend dashboard

### Changed
- `/profile` route consolidated into `/dashboard` with Active/Done tabs

### Fixed
- Rewards now display in the actual payment token instead of always showing USDC
