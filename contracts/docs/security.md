# Security

This document describes the security measures built into AgentHands and known limitations that should be considered in production deployments.

## Reentrancy Protection

All functions that move funds are decorated with OpenZeppelin's `nonReentrant` modifier:

- `cancelTask()`
- `approveTask()`
- `claimExpired()`
- `resolveDispute()`

The modifier uses a lock stored in a single storage slot. It prevents a malicious ERC20 token from re-entering the contract mid-transfer to drain escrow. Note that the whitelist of allowed tokens already significantly reduces this risk — whitelisted tokens are vetted to not have transfer hooks — but `nonReentrant` provides defense in depth.

## SafeERC20

All ERC20 operations use OpenZeppelin's `SafeERC20.safeTransfer()` and `safeTransferFrom()`. This guards against tokens that:

- Return false instead of reverting on failure
- Do not return a boolean at all (non-standard ERC20s)

## UUPS Access Control

The `_authorizeUpgrade()` function is restricted to `onlyOwner`. This means only the current owner can replace the implementation. If the owner key is compromised, the contract can be upgraded to a malicious implementation. See the Ownership section below.

## Ownership

The contract is owned by the EOA that deployed it. The owner can:

- Upgrade the implementation
- Resolve disputes
- Add/remove allowed tokens
- Change fee configuration

For production, the owner should be a **Gnosis Safe multisig** requiring M-of-N signatures. A single EOA owner is a single point of failure — if the key is lost or stolen, upgrade and admin functions are permanently locked or can be abused.

## Known Limitation: Centralized Dispute Resolution

Dispute outcomes are decided by a single owner address with no on-chain appeal. See [dispute-resolution.md](./dispute-resolution.md) for the rationale and planned future improvements.

## Flash Loan Attack Surface

AgentHands does not implement any AMM, lending, or price-sensitive logic. There is no flash loan attack surface. The escrow accounting is based on nominal token amounts recorded at task creation, not on live balances or oracle prices.

## Proxy Address

Celo mainnet proxy: `0xADA0466303441102cb16F8eC1594C744d603f746`

Verify the implementation address on-chain before interacting:

```bash
cast storage 0xADA0466303441102cb16F8eC1594C744d603f746 \
  0x360894a13ba1a3210667c828492db98dca3e2076 \
  --rpc-url https://forno.celo.org
```

This slot is the EIP-1967 implementation slot. Compare the result to the known deployment artifact.

## Audit Status

The contract has not been formally audited as of the initial mainnet deployment. Community review is ongoing. Do not use as a reference for security-critical production systems without independent audit.
