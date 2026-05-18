# Deployment and Verification

This document covers the current mainnet deployment and how to verify the contract on Celoscan.

## Current Mainnet Deployment (Celo — chain ID 42220)

| Component | Address | Explorer |
|-----------|---------|---------|
| Proxy (AgentHands) | `0xADA0466303441102cb16F8eC1594C744d603f746` | [celoscan.io](https://celoscan.io/address/0xADA0466303441102cb16F8eC1594C744d603f746) |
| Implementation v1.1.0 | `0x29faf6cAFA4BeA1dC7c232f0a1818d4da6b724DD` | [celoscan.io](https://celoscan.io/address/0x29faf6cAFA4BeA1dC7c232f0a1818d4da6b724DD) |
| USDC | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` | — |
| CELO ERC-20 | `0x471EcE3750Da237f93B8E339c536989b8978a438` | — |

## Fresh Deployment

```bash
cd contracts
cp .env.example .env
# Fill in PRIVATE_KEY, CELO_RPC, ETHERSCAN_API_KEY

forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $CELO_RPC \
  --broadcast --slow \
  --verify \
  --verifier etherscan \
  --verifier-url "https://api.etherscan.io/v2/api?chainid=42220" \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

The deploy script:
1. Deploys the `AgentHands` implementation contract.
2. Deploys an ERC1967 UUPS proxy pointing at the implementation.
3. Calls `initialize(feeRecipient, platformFeeBps)` through the proxy.
4. Verifies both contracts on Celoscan.

## Upgrading

Only the proxy owner can push an upgrade:

```bash
forge script script/Upgrade.s.sol:UpgradeScript \
  --rpc-url $CELO_RPC \
  --broadcast --slow
```

This deploys a new implementation, then calls `upgradeToAndCall()` on the proxy via the owner wallet.

## Manual Verification

If automatic verification fails, re-verify manually:

```bash
# Verify the implementation
forge verify-contract \
  0x29faf6cAFA4BeA1dC7c232f0a1818d4da6b724DD \
  contracts/src/AgentHands.sol:AgentHands \
  --chain-id 42220 \
  --verifier etherscan \
  --verifier-url "https://api.etherscan.io/v2/api?chainid=42220" \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Verify the proxy (ERC1967)
forge verify-contract \
  0xADA0466303441102cb16F8eC1594C744d603f746 \
  lib/openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy \
  --chain-id 42220 \
  --verifier etherscan \
  --verifier-url "https://api.etherscan.io/v2/api?chainid=42220" \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address,bytes)" \
    0x29faf6cAFA4BeA1dC7c232f0a1818d4da6b724DD \
    $(cast calldata "initialize(address,uint256)" $FEE_RECIPIENT 250))
```

## Post-Deployment Checklist

After a fresh deployment or upgrade:

- [ ] Verify both proxy and implementation on Celoscan
- [ ] Call `version()` to confirm the implementation version string
- [ ] Call `setAllowedToken(USDC_ADDRESS, true)` to whitelist USDC
- [ ] Call `setAllowedToken(CELO_ADDRESS, true)` to whitelist CELO (optional)
- [ ] Confirm `platformFeeBps` and `feeRecipient` are set correctly
- [ ] Create a test task on mainnet with a small reward and run through the full lifecycle
- [ ] Update `NEXT_PUBLIC_AGENTHANDS_ADDRESS` in the frontend if the proxy address changed

## Verifying Implementation Slot

To confirm which implementation the proxy is pointing at:

```bash
cast storage \
  0xADA0466303441102cb16F8eC1594C744d603f746 \
  0x360894a13ba1a3210667c828492db98dca3e2076ccc626bf8d7bb38a9dc2ce00 \
  --rpc-url https://forno.celo.org
```

The value at this slot is the ERC1967 implementation address.
