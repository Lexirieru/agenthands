# Upgrade Guide

AgentHands uses the UUPS (Universal Upgradeable Proxy Standard, EIP-1822) pattern. The proxy contract holds state and delegates all calls to a separate implementation contract. The implementation can be replaced by the owner, enabling bug fixes and feature additions without changing the proxy address.

## How UUPS Works

- The **proxy** stores all state variables and the address of the current implementation.
- All user calls hit the proxy, which `delegatecall`s to the implementation.
- The upgrade logic (`_authorizeUpgrade`) lives in the implementation, gated to `onlyOwner`.
- To upgrade, the owner calls `upgradeToAndCall(newImpl, data)` on the proxy.

This differs from Transparent Proxy in that the proxy itself has no admin logic — all upgrade authority is in the implementation.

## Step 1: Deploy New Implementation

Write and test your updated `AgentHands.sol`, then deploy the implementation (not a proxy):

```bash
forge build

PRIVATE_KEY=<deployer-key> \
forge script script/DeployImpl.s.sol \
  --rpc-url https://forno.celo.org \
  --broadcast

# Record the new implementation address from the broadcast output
```

## Step 2: Upgrade the Proxy

Call `upgradeToAndCall` on the existing proxy as the owner:

```bash
PRIVATE_KEY=<owner-key> \
NEW_IMPL=<new-implementation-address> \
forge script script/Upgrade.s.sol \
  --rpc-url https://forno.celo.org \
  --broadcast
```

`script/Upgrade.s.sol` calls `UUPSUpgradeable.upgradeToAndCall(newImpl, "")`. Pass encoded initializer calldata instead of `""` if the new version requires a migration function.

## Storage Layout Warning

Because the proxy delegates to the implementation via `delegatecall`, all state is stored in the **proxy's** storage slots. If you add, remove, or reorder state variables in a new implementation, the slot assignments change and will corrupt existing data.

Rules to follow:
- Never remove existing state variables.
- Never reorder existing state variables.
- Only append new variables at the end of the contract or in an inherited storage gap.
- Use OpenZeppelin's `__gap` pattern if inheritance is involved.

Before upgrading, run:

```bash
forge inspect AgentHands storageLayout
```

Compare the output against the deployed implementation's layout. Any slot difference is a breaking change.

## Test on Testnet First

Always run the upgrade on Alfajores testnet before Celo mainnet:

```bash
PRIVATE_KEY=<key> \
NEW_IMPL=<impl> \
forge script script/Upgrade.s.sol \
  --rpc-url https://alfajores-forno.celo-testnet.org \
  --broadcast
```

Verify functionality, then repeat against mainnet.

## Proxy Address

Celo mainnet proxy: `0xADA0466303441102cb16F8eC1594C744d603f746`
