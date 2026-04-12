# ZKai Frontend

This is the Next.js web application for ZKai, deployed at `https://zkai.vercel.app`, providing wallet connection, provider browsing, and private prompt submission through the gateway.

## Overview

The frontend is a Next.js App Router project (`next@16.2.1`) that powers the consumer-facing ZKai experience. It communicates through gateway/app API routes under `/api/*` (including `/api/v1/chat/completions`) and does not connect directly to provider WebSocket nodes from the browser. The dashboard surfaces API keys, usage history, escrow actions, provider data, and model analytics using Neon-backed API routes.

## Prerequisites

1. Node.js `18.17` or later (LTS recommended). Verify with `node --version`.
2. A package manager: `npm` (default in this repo via `package-lock.json`), Yarn `1.22+`, pnpm `8+`, or Bun.
3. A Midnight Lace wallet (tNIGHT) or a valid ZKai API key generated from the dashboard at `https://zkai.vercel.app/dashboard`.
4. Git for cloning and updating the repository.

## Environment Variables

| Variable | Required | Description | Example |
|---|---|---|---|
| `NEXT_PUBLIC_REGISTRY_CONTRACT` | Yes | Provider registry contract address used by frontend/web3 helpers | `70f8c6b8...` |
| `NEXT_PUBLIC_ESCROW_CONTRACT` | Yes | PaymentEscrow contract address used by escrow APIs | `c7bcfc56...` |
| `NEXT_PUBLIC_ATTESTATION_CONTRACT` | Yes | Attestation registry contract address | `9dfc5a38...` |
| `NEXT_PUBLIC_INDEXER_URL` | Yes | Midnight indexer GraphQL endpoint for read-side data | `https://indexer.preprod.midnight.network/api/v3/graphql` |
| `NEXT_PUBLIC_API_BASE_URL` | No | Base URL used in model detail API examples | `https://api.zkai.io/v1` |
| `DATABASE_URL` | Yes (server-side) | Neon PostgreSQL connection string for auth/providers/jobs APIs | `postgresql://user:pass@host/db` |
| `ZKAI_BRIDGE_URL` | No | Bridge URL used by escrow deposit API route | `http://localhost:7300` |
| `PROOF_SERVER_URL` | No | Proof server URL used by `/api/escrow/build-tx` | `http://localhost:6300` |
| `ZKAI_RELAY_SECRET` | Yes (if using provider bootstrap flow) | Secret returned by `/api/relay-config` for provider relay auth | `your-relay-secret` |
| `ARTIFICIAL_ANALYSIS_API_KEY` | No | Enables Artificial Analysis enrichments in model endpoints | `aa_...` |
| `PROVIDERS_API_URL` | No | Optional remote providers source; falls back to Neon DB if unset | `https://your-service/providers` |

Copy `.env.example` to `.env.local` and fill values. If `.env.example` is not present in your branch, create `.env.local` manually from the table above. Never commit `.env.local`.

## Installation

1. Clone the repository:

```bash
git clone https://github.com/Eshan276/zkai.git
cd zkai/frontend
```

2. Install dependencies (choose one):

```bash
npm install       # npm (default for this repo)
yarn install      # yarn
pnpm install      # pnpm
bun install       # bun
```

> A successful install creates `node_modules/` without hard errors. Peer dependency warnings are usually safe to ignore unless they block build output.

3. Create your local env file:

```bash
cp .env.example .env.local 2>/dev/null || cp .env .env.local
```

4. Fill `.env.local` with the values from the table above.

## Running the Development Server

1. Start the dev server:

```bash
npm run dev
# or: yarn dev
# or: pnpm dev
# or: bun run dev
```

2. Open `http://localhost:3000` in your browser.

3. Expected behavior: the landing page loads with navigation, a `Connect Wallet` action, and gateway-backed model/provider sections. If provider/model data is empty, validate `DATABASE_URL`, contract env vars, and indexer URL.

Hot reload is enabled, so file changes in `app/`, `components/`, and `lib/` should appear immediately.

## Building for Production

```bash
npm run build
npm start
```

The production server runs on port `3000` by default. Set `PORT` to override locally. Vercel will run the build automatically on pushes to your configured branch.

## Project Structure

| Path | Purpose |
|---|---|
| `app/` | Next.js App Router pages and API route handlers |
| `app/page.tsx` | Marketing/landing page |
| `app/dashboard/page.tsx` | Consumer dashboard (API keys, activity, logs, credits) |
| `app/provider_dashboard/page.tsx` | Provider ranking and provider-level job analytics |
| `app/model/page.tsx` | Model catalog page |
| `app/model/[slug]/page.tsx` | Model detail view |
| `app/api/v1/chat/completions/route.ts` | Gateway inference route (OpenAI-compatible) |
| `app/api/providers/*` | Provider listing/register/deregister APIs |
| `app/api/auth/*` | Wallet challenge + API key issuance/verification routes |
| `app/api/escrow/*` | Escrow balance/deposit/prove transaction routes |
| `app/api/jobs/route.ts` | Job history endpoint |
| `components/` | Shared UI and sections |
| `components/navigation.tsx` | Global nav and wallet connect flow |
| `components/models/` | Model table/detail UI building blocks |
| `lib/db.ts` | Neon client and schema bootstrap helpers |
| `lib/wallet.ts` | Midnight Lace wallet integration helpers |
| `lib/data/model-fetchers.ts` | Artificial Analysis/provider data synthesis |
| `lib/contracts.ts` | Contract address mapping from env vars |
| `public/` | Static assets and zk proving artifacts |
| `.env` | Local env file currently used in this repo; prefer `.env.local` for local overrides |
| `package.json` | Scripts, dependencies, and Next.js version |

## Connecting a Wallet

1. Click `Connect Wallet` in the top navigation.
2. Approve connection in the Midnight Lace extension (`preprod` network).
3. The connected address appears in the nav, and dashboard sections can load wallet-linked data.
4. Use `Dashboard -> API Keys` to mint API keys for SDK or HTTP clients.

If you prefer API-key-only usage, generate a key in dashboard first and pass it in `Authorization: Bearer ...` when calling gateway endpoints.

## Using the Interface

#### Browsing Providers

1. Open `Ranking` (`/provider_dashboard`) to inspect provider IDs, pricing, reputation, hardware, and job history.
2. Data is served from `GET /api/providers` and enriched with job metrics from `jobs` rows.
3. Provider endpoint values containing `/relay/` indicate active relay-based routing.

#### Submitting a Prompt

1. Send chat requests through `POST /api/v1/chat/completions` using an API key.
2. The gateway authenticates the key, selects an active provider, and forwards the payload to the provider endpoint or relay URL.
3. Responses return in OpenAI-compatible shape, with `x_zkai` metadata including `job_id` and attestation hash when available.

#### Viewing a Job Receipt

1. Open dashboard activity/logs sections or query `GET /api/jobs?wallet=<wallet_address>`.
2. Each row includes provider ID, model, cost, token counts, latency, CPU/RAM stats, and attestation hash.
3. You can use the attestation hash to cross-check anchored records in Midnight-facing tooling.

## Deploying to Vercel

1. Fork the repository.
2. Import the fork in Vercel (`vercel.com/new`).
3. Configure all required env vars in project settings (same keys as `.env.local`).
4. Deploy; Vercel builds and publishes on each push according to your branch settings.

`app/api/*` routes run as Vercel serverless functions. Ensure `DATABASE_URL` is reachable from Vercel runtime and that proof/bridge URLs are accessible for escrow-specific routes.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Provider/model data is empty | Missing DB/indexer/contract config | Check `DATABASE_URL`, `NEXT_PUBLIC_*` contract vars, and `NEXT_PUBLIC_INDEXER_URL` |
| Wallet connect button fails | Lace extension missing or wrong network | Install Midnight Lace and connect to `preprod` |
| `DATABASE_URL` error on API calls | Server env var not set | Add `DATABASE_URL` and restart `npm run dev` |
| Escrow deposit route returns bridge error | Bridge not running locally | Start provider stack and verify `ZKAI_BRIDGE_URL` |
| Build errors on missing module | Incomplete dependency install | Remove `node_modules` and reinstall with your package manager |

## Related

- [../README.md](../README.md) - repository overview and quick starts
- [../architecture.md](../architecture.md) - full architecture and trust model
- [../sdk/README.md](../sdk/README.md) - Python SDK, CLI, and bridge documentation
- [../RUNBOOK.md](../RUNBOOK.md) - operational runbook
