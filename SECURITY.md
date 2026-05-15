# Security Policy

## Supported Versions

| Component | Supported |
|-----------|-----------|
| AgentHands smart contract (Celo mainnet) | Yes |
| Frontend (talentapp.vercel.app) | Yes |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Send a report to: axelmatsama@gmail.com

Include:
- Description of the vulnerability
- Steps to reproduce
- Affected contract address or component
- Potential impact (funds at risk, access control bypass, etc.)

You will receive an acknowledgement within 48 hours. If the issue is confirmed, a fix will be prioritised based on severity.

## Scope

### In scope
- `contracts/src/AgentHands.sol` — fund escrow, access control, task lifecycle
- UUPS proxy at `0xADA0466303441102cb16F8eC1594C744d603f746` (Celo mainnet)
- Frontend authentication and transaction signing flows

### Out of scope
- Third-party dependencies (OpenZeppelin, Foundry)
- Infrastructure (Vercel, Celo RPC providers)
- Social engineering attacks

## Known Limitations

- Dispute resolution is centralised: the contract owner acts as sole arbitrator.
- The owner key is a single EOA. A multisig upgrade is planned for production hardening.

## Disclosure Policy

Responsible disclosure is appreciated. Public disclosure is permitted after a fix has been deployed, or after 90 days if no response is received.
