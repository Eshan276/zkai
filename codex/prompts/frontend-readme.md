---
mode: agent
tools:
[vscode, execute, read, agent, edit, search, web, browser, todo]
description: >
  Generate frontend/README.md for ZKai.
  Covers what the frontend is, prerequisites, environment variables, local dev setup,
  project structure, and how to use each feature. No emojis. Numbered steps throughout.
---

Generate `frontend/README.md`. Overwrite any existing content.

Before writing, inspect the `frontend/` directory using the codebase tool:
- Read `package.json` for: Next.js version, package manager lock file, scripts, dependencies
- Search source files for `process.env.NEXT_PUBLIC_` to discover all environment variables
- Check `app/` or `pages/` to understand the routing structure
- Check for any existing `.env.example`

Use what you find. If something is not present, use the logical defaults described below.

---

## Required sections (in this order)

### H1: `ZKai Frontend`

One sentence: this is the Next.js web application for ZKai, deployed at `https://zkai.vercel.app`, providing wallet connection, provider browsing, and encrypted prompt submission.

---

### Overview

Two to three sentences:
- The frontend is a Next.js application that serves as the consumer-facing interface for the ZKai network
- It communicates exclusively with the gateway API (`/api/v1/...`) — it never calls the relay or provider nodes directly
- The Consumer Dashboard shows job history, wallet balance, and provider statistics

---

### Prerequisites

A numbered list — be explicit with version requirements:

1. Node.js 18.17 or later (LTS). Verify: `node --version`
2. A package manager: npm (included with Node.js), Yarn 1.22+, or pnpm 8+
3. A tNIGHT wallet or a ZKai API key. Obtain an API key from the Consumer Dashboard at `zkai.vercel.app`
4. Git to clone the repository

---

### Environment Variables

A table. Discover the real variables from the source using the codebase tool.
If unable to discover them, use these logical defaults:

| Variable | Required | Description | Example |
|---|---|---|---|
| `NEXT_PUBLIC_GATEWAY_URL` | Yes | ZKai gateway base URL | `https://zkai.vercel.app` |
| `NEXT_PUBLIC_MIDNIGHT_RPC` | Yes | Midnight preprod RPC endpoint | `https://rpc.testnet.midnight.network` |
| `NEXT_PUBLIC_REGISTRY_CONTRACT` | Yes | Deployed ProviderRegistry contract address | `0xabc...` |
| `NEXT_PUBLIC_ESCROW_CONTRACT` | Yes | Deployed PaymentEscrow contract address | `0xdef...` |
| `DATABASE_URL` | Yes (server-side) | Neon PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `ZKAI_INTERNAL_SECRET` | Yes (server-side) | Secret for gateway-to-relay auth | (generate randomly) |

Add a note: copy `.env.example` to `.env.local` and fill in values. Never commit `.env.local`.

---

### Installation

Numbered steps:

1. Clone the repository:
```bash
git clone https://github.com/ansu555/zkai.git
cd zkai/frontend
```

2. Install dependencies. Choose one:
```bash
npm install       # npm
yarn install      # yarn
pnpm install      # pnpm
```

3. Copy the environment template:
```bash
cp .env.example .env.local
```

4. Fill in `.env.local` with the values from the table above.

Add a blockquote after step 2: a successful install creates `node_modules/` with no error output. If you see peer dependency warnings, they are safe to ignore.

---

### Running the Development Server

Numbered steps:

1. Start the server:
```bash
npm run dev
# or: yarn dev / pnpm dev
```

2. Open `http://localhost:3000` in your browser.

3. Expected: the ZKai interface loads with a "Connect Wallet" button and a provider list. If the provider list is empty, check that `NEXT_PUBLIC_REGISTRY_CONTRACT` is set correctly.

Add a note: hot reload is enabled. Changes to source files reflect immediately.

---

### Building for Production

```bash
npm run build
npm start
```

The production server runs on port 3000 by default. Set the `PORT` environment variable to change it. The Vercel deployment runs this build automatically on every push to `main`.

---

### Project Structure

Inspect the actual directory. If the directory follows Next.js App Router conventions, use this structure table (adjust based on what you find):

| Path | Purpose |
|---|---|
| `app/` | Next.js App Router — pages and layouts |
| `app/page.tsx` | Root page — provider browser and prompt interface |
| `app/layout.tsx` | Root layout — wallet provider context, global styles |
| `app/api/` | API route handlers (proxies to gateway or direct DB queries) |
| `app/dashboard/` | Consumer Dashboard — job history, usage, receipts |
| `components/` | Reusable React components |
| `components/ProviderCard.tsx` | Provider display: model, price, reputation, stake |
| `components/ChatInterface.tsx` | Prompt input and response display |
| `components/WalletConnect.tsx` | tNIGHT wallet connection button |
| `components/JobReceipt.tsx` | Per-job receipt: job ID, cost, attestation status |
| `lib/` | Utility functions and client wrappers |
| `lib/gateway.ts` | Typed fetch wrappers for the ZKai gateway API |
| `lib/wallet.ts` | Midnight wallet integration helpers |
| `public/` | Static assets |
| `.env.example` | Environment variable template |

---

### Connecting a Wallet

Numbered steps:

1. Click "Connect Wallet" in the top navigation bar
2. The tNIGHT wallet selector appears — approve the connection in your wallet extension
3. Your DUST balance appears in the header
4. You are now ready to browse providers and submit prompts

Add a note: if you prefer to use an API key instead of a wallet, click "Use API Key" on the login screen and paste your key from the Consumer Dashboard at `zkai.vercel.app`.

---

### Using the Interface

Three subsections (`####`):

#### Browsing Providers
1. The provider list loads from the gateway on page load
2. Each card shows: model supported, price per token (DUST), reputation score, stake amount
3. Click a provider card to pin it for your next request; otherwise the gateway selects automatically

#### Submitting a Prompt
1. Type your prompt in the input area
2. Click "Send" — the request goes to the gateway, which routes it through the relay to the selected provider
3. A loading state appears while inference runs (typically 2–10 seconds)
4. The response appears in the conversation area

#### Viewing a Job Receipt
1. Click "View Receipt" below any response
2. The receipt shows: job ID, provider, model, token count, DUST cost, attestation hash, and on-chain verification status
3. "Verified" means the SHA-256 attestation hash returned by the enclave matches the hash anchored in the Midnight `AttestationRegistry`

---

### Deploying to Vercel

The project is configured for Vercel deployment. To deploy your own instance:

1. Fork the repository on GitHub
2. Import the fork into Vercel at `vercel.com/new`
3. Set all environment variables in the Vercel project settings (same as `.env.local`)
4. Vercel will build and deploy automatically on every push to `main`

The `app/api/` routes run as Vercel Edge Functions. Ensure `DATABASE_URL` points to a Neon PostgreSQL instance accessible from Vercel's edge network.

---

### Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Provider list is empty | Wrong contract address or RPC endpoint | Check `NEXT_PUBLIC_REGISTRY_CONTRACT` and `NEXT_PUBLIC_MIDNIGHT_RPC` |
| "Connect Wallet" is disabled | tNIGHT wallet extension not installed | Install the extension and reload |
| Response never arrives | Provider node is offline | Try a different provider; check relay status |
| `DATABASE_URL` error on start | Neon connection string not set | Set `DATABASE_URL` in `.env.local` |
| Build fails: module not found | Dependencies not installed | Run `npm install` again |

---

### Related

- [../README.md](../README.md) — project overview and quick start
- [../architecture.md](../architecture.md) — full system architecture
- [../sdk/README.md](../sdk/README.md) — Python SDK and CLI reference
- [../RUNBOOK.md](../RUNBOOK.md) — operational runbook

---

## Formatting constraints

- No emojis
- All shell commands in fenced `bash` blocks
- All environment variable names in inline code
- File ends with a newline
