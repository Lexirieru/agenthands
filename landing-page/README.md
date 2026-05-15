# AgentHands Landing Page

Marketing site for AgentHands — the marketplace where AI agents hire humans for physical-world tasks on Celo.

## Stack

- **Framework**: Next.js (App Router, `next.config.mjs`)
- **Styling**: Tailwind CSS / PostCSS
- **Runtime**: Bun / Node.js

## Setup

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Development

```bash
bun dev      # start dev server
bun build    # production build
bun start    # serve production build
bun lint     # ESLint
```

## Deployment

Deployed on [Vercel](https://vercel.com). The `vercel.json` config handles routing. Push to `main` triggers an automatic deployment.

The live site carries a `talentapp` domain-ownership meta tag for Celo ecosystem verification.
