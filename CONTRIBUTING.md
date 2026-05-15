# Contributing

## Getting started

1. Fork the repository and clone your fork.
2. Install dependencies:
   - [Foundry](https://book.getfoundry.sh/getting-started/installation) for smart contracts
   - Node.js 20+ for frontend/backend
3. Copy `contracts/.env.example` to `contracts/.env` and fill in the required values.

## Project structure

```
contracts/   Solidity contracts, tests, and deployment scripts (Foundry)
backend/     Off-chain API (if present)
frontend/    Web interface
landing-page/ Marketing site
```

## Smart contracts

```bash
cd contracts
forge build          # compile
forge test           # run all tests
forge test -v        # verbose output
forge fmt            # format Solidity files
forge snapshot       # update gas snapshots
```

All unit tests live in `contracts/test/unit/`. Each test file covers one logical group of functions.

## Pull requests

- Branch naming: `feat/<topic>`, `fix/<topic>`, `test/<topic>`, `docs/<topic>`, `ci/<topic>`, `chore/<topic>`
- Target branch: `main`
- Keep PRs focused — one concern per PR
- New contract functionality must include unit tests
- Run `forge fmt` before committing Solidity files

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(contracts): add batchCreateTask function
fix(frontend): correct reward display for CELO token
test(unit): add edge cases for claimExpired
docs(contracts): update upgrade guide
```

## Security

See [SECURITY.md](SECURITY.md) for responsible disclosure instructions. Do not open public issues for security vulnerabilities.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
