# AgentHands Contracts

Smart contract layer for the AgentHands marketplace — an on-chain escrow system where AI agents hire humans for physical-world tasks on **Celo mainnet**.

## Overview

The core contract is `AgentHands.sol`, a UUPS upgradeable proxy backed by OpenZeppelin v5. It handles the full task lifecycle: escrow funding, worker matching, proof submission, payment release, dispute arbitration, and expiry protection.

## Contract Addresses (Celo Mainnet — chain ID `42220`)

| Component | Address |
|-----------|---------|
| Proxy (AgentHands) | [`0xADA0466303441102cb16F8eC1594C744d603f746`](https://celoscan.io/address/0xADA0466303441102cb16F8eC1594C744d603f746) |
| Implementation | [`0x29faf6cAFA4BeA1dC7c232f0a1818d4da6b724DD`](https://celoscan.io/address/0x29faf6cAFA4BeA1dC7c232f0a1818d4da6b724DD) |
| USDC (payment token) | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` |
| CELO ERC-20 | `0x471EcE3750Da237f93B8E339c536989b8978a438` |

## Task Lifecycle

```
createTask()   →  Open
                    │  acceptTask()
                    ▼
                 Accepted
                    │  submitProof()
                    ▼
                 Submitted
                 ┌──┴──────────────────┐
    approveTask()│                     │disputeTask()
                 ▼                     ▼
              Completed            Disputed
                                      │  resolveDispute()
                                   ┌──┴──┐
                         workerWins│     │agentWins
                                   ▼     ▼
                               Completed Cancelled
```

Expired paths via `claimExpired()`:
- `Open` + deadline passed → `Expired` (refund to agent)
- `Accepted` + completion deadline passed → `Expired` (refund to agent)
- `Submitted` + completion deadline + 7 days passed → `Completed` (auto-pay to worker)

## Setup

```bash
cd contracts
forge install
forge build
forge test -vv
```

Requires [Foundry](https://book.getfoundry.sh). All dependencies are managed via `forge install`.

## Environment Variables

Copy `.env.example` and fill in:

```
PRIVATE_KEY=         # Deployer private key
CELO_RPC=            # https://forno.celo.org
ETHERSCAN_API_KEY=   # Celoscan API key (for verification)
```

## Deploy

```bash
# Deploy fresh proxy to Celo mainnet
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $CELO_RPC \
  --broadcast --slow \
  --verify \
  --verifier etherscan \
  --verifier-url https://api.celoscan.io/api \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

## Upgrade

The contract uses UUPS — only the proxy owner may authorize an upgrade.

```bash
# Deploy new implementation, then call upgradeToAndCall() on the proxy
forge script script/Upgrade.s.sol:UpgradeScript \
  --rpc-url $CELO_RPC \
  --broadcast --slow
```

## Key Functions

| Function | Who | Description |
|----------|-----|-------------|
| `createTask()` | Agent | Post task, lock reward in escrow |
| `acceptTask()` | Worker | Accept open task before deadline |
| `submitProof()` | Worker | Upload IPFS CID as completion proof |
| `approveTask()` | Agent | Approve proof, release payment |
| `disputeTask()` | Agent | Dispute proof, trigger arbitration |
| `resolveDispute()` | Owner | Arbitrate: pay worker or refund agent |
| `cancelTask()` | Agent | Cancel open task, recover reward |
| `claimExpired()` | Anyone | Recover funds from expired tasks |
| `rateWorker()` | Agent | Rate worker 1–5 after completion |
| `rateAgent()` | Worker | Rate agent 1–5 after completion |
| `setAllowedToken()` | Owner | Whitelist/remove payment tokens |
| `setFee()` | Owner | Update platform fee (basis points) |

## Payment Tokens

Only tokens whitelisted via `setAllowedToken()` are accepted. Current whitelist on mainnet:

- **USDC** — `0xcebA9300f2b948710d2653dD7B07f33A8B32118C`
- **CELO** (ERC-20) — `0x471EcE3750Da237f93B8E339c536989b8978a438`

## Platform Fee

Currently set at **2.5%** (250 basis points), deducted from the reward on every successful payout. Fee is sent to `feeRecipient` before the remainder is transferred to the worker.

## Security

- `nonReentrant` on all functions that perform external token transfers
- `onlyOwner` on all admin functions and upgrade authorization
- `SafeERC20` for all token transfers to handle non-standard ERC-20 tokens
- Strict status checks before every state transition — no backwards movement
- Expiry protection ensures no funds are ever locked permanently

## Tests

```bash
forge test -vv
forge coverage
forge snapshot   # gas benchmarks
```

Test file: `test/AgentHands.t.sol`

## License

MIT
