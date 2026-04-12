# ZKai — codex Workspace Instructions

## Project Identity

ZKai is a decentralized private AI inference network built on the Midnight blockchain.
Users submit inference requests through an OpenAI-compatible API. Requests are authenticated
by a hosted gateway, routed through a WebSocket relay to a provider node, executed inside a
Trusted Execution Environment, attested on the Midnight blockchain with a ZK proof, and
returned to the caller — without exposing prompt content to any intermediary.

Live gateway: `zkai.vercel.app`

---

## System Layers

### Consumer
The caller: an SDK/Application, a tNIGHT wallet, or a raw API key.
Entry point: `POST /api/v1/chat/completions`

### Gateway · Vercel
- Authenticates requests (API key verification, wallet auth)
- Selects a provider from the registry (weighted by reputation and model support)
- Logs jobs to Neon PostgreSQL (`users`, `api_keys`, `jobs`, `providers` tables)
- Hosts the Consumer Dashboard

### Relay · Fly.io
- Receives HTTP POST from the gateway at `/relay/:provider_id`
- Maintains persistent WebSocket connections to all active provider nodes
- Routes the request to the correct provider over WebSocket
- Heartbeat every 30 seconds

### Provider Node · Docker Compose (two containers)

**zkai-enclave** — Python / Flask
- Runs Ollama inference: models `qwen2.5:1.5b` and `llama3.2:3b`
- Computes SHA-256 attestation of each response
- Exposes `/health` with hardware information
- Isolated by Gramine SGX / Direct Mode (TEE layer)

**zkai-bridge** — Node.js / Fastify
- Manages the Midnight Wallet SDK with LevelDB cache
- Payment Routes: `deductBalance`, `deposit`
- Registry Routes: `register`, `deregister`
- Attestation Route: `submitAttestation`
- Calls ZK Proof Server (`midnightnetwork/proof-server`, port 6300)

### Midnight Blockchain · Preprod · Compact Contracts
- `ProviderRegistry` — provider registration and discovery
- `PaymentEscrow` — shielded DUST payments
- `AttestationRegistry` — on-chain attestation anchoring

---

## Request Flow (6 steps)

1. Consumer sends inference request to the Gateway (`POST /api/v1/chat/completions`)
2. Gateway authenticates the key/wallet, selects a provider, logs the job
3. Gateway posts to Relay (`/relay/:provider_id`); Relay forwards over WebSocket
4. `zkai-enclave` runs Ollama inference, computes SHA-256 attestation of the response
5. `zkai-bridge` calls the ZK Proof Server, then calls `deductBalance` + `submitAttestation`
6. Transaction submitted to Midnight; response returns on the same WebSocket path

---

## Actual Repository Structure

```
zkai/
├── .github/
│   ├── codex-instructions.md     ← you are here
│   └── prompts/                    ← codex prompt files
├── bridge/              Node.js / Fastify — zkai-bridge (wallet, payments, ZK, attestation)
├── cli/                 Provider CLI tool
├── contracts/src/       Compact smart contracts for Midnight
├── data/                Seed data and fixtures
├── deploy/              Docker Compose and cloud deployment configs
├── docs/                Supplementary documentation
├── frontend/            Next.js — Consumer Dashboard (zkai.vercel.app)
├── provider/            Python / Flask — zkai-enclave (Ollama inference + attestation)
├── relay/               Node.js — WebSocket relay (Fly.io)
├── scripts/             Utility and automation scripts
├── sdk/                 Python zkai package (OpenAI-compatible client)
├── wallet/              Midnight wallet utilities
├── architecture.drawio
├── architecture.drawio.png   ← architecture diagram (reference this file)
├── architecture.md
├── DEVPLAN.md
├── RUNBOOK.md
└── README.md
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Gateway | Next.js API routes on Vercel |
| Database | Neon PostgreSQL |
| Relay | Node.js WebSocket server on Fly.io |
| TEE runtime | Gramine SGX / Direct Mode |
| Inference | Ollama — qwen2.5:1.5b, llama3.2:3b |
| Attestation | SHA-256 of response, anchored on Midnight |
| Bridge | Node.js / Fastify (zkai-bridge) |
| ZK proofs | midnightnetwork/proof-server (port 6300) |
| Smart contracts | Compact language on Midnight preprod |
| Wallet | Midnight Wallet SDK + LevelDB cache |
| Client SDK | Python (zkai package, OpenAI-compatible) |
| Provider CLI | cli/ directory |
| Frontend | Next.js (zkai.vercel.app) |
| Containerisation | Docker Compose (enclave + bridge as two services) |
| Primary languages | TypeScript 80%, Python 15%, Shell 2% |

---

## Documentation Writing Standards

**Tone and style**
- Clear, direct technical prose aimed at developers familiar with Python, TypeScript, and cloud infrastructure
- No marketing superlatives — let the architecture speak for itself
- Passive voice only when the actor is genuinely unimportant

**Formatting**
- No emojis anywhere in any documentation file
- ATX headings: `#`, `##`, `###`, `####`
- All code in fenced blocks with a language specifier (`python`, `bash`, `typescript`, etc.)
- Tables for comparisons, parameter references, and stack summaries
- Horizontal rules (`---`) between H2 sections in longer documents
- One blank line between every top-level section
- Minimal badge row acceptable in root README only

**Content rules**
- Architecture documents must contain no fenced code blocks — describe flows in prose and tables only
- Setup guides must list every prerequisite, every command in order, and an expected-output note after non-trivial steps
- SDK / API docs follow: concept → signature → example → notes
- Every document ends with a "Related" section linking to other docs in the repo
- The architecture diagram lives at `architecture.drawio.png` in the repo root — reference it by that relative path from each document
