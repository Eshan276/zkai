# ZKai

> Decentralized private AI inference on the Midnight blockchain.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![Status: Preprod](https://img.shields.io/badge/Status-Preprod-orange.svg)](https://zkai.vercel.app) [![Live: zkai.vercel.app](https://img.shields.io/badge/Live-zkai.vercel.app-black?logo=vercel)](https://zkai.vercel.app) [![Python 3.9+](https://img.shields.io/badge/Python-3.9%2B-blue?logo=python)](https://www.python.org/) [![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org/)

ZKai is a decentralized inference network that combines confidential execution with shielded payment settlement. Consumers submit OpenAI-style requests through a hosted gateway; providers run inference inside enclave-isolated infrastructure. Every completed job produces a SHA-256 attestation hash anchored on Midnight. The result is private inference with verifiable billing and a familiar developer API.

---

## Table of Contents

1. [What is ZKai](#what-is-zkai)
2. [Key Features](#key-features)
3. [Architecture](#architecture)
4. [How a Request Travels](#how-a-request-travels)
5. [Roadmap](#roadmap)
6. [Quick Start — Using the API](#quick-start--using-the-api)
   - [Install the CLI (one-line)](#install-the-cli-one-line)
   - [HTTP (curl)](#http-curl)
   - [Python SDK](#python-sdk)
   - [LangChain](#langchain)
7. [Quick Start — Running a Provider Node](#quick-start--running-a-provider-node)
   - [Prerequisites](#prerequisites)
   - [Step 1 — Clone & install the CLI](#step-1--clone--install-the-cli)
   - [Step 2 — Initialize](#step-2--initialize)
   - [Step 3 — Fund your wallet](#step-3--fund-your-wallet)
   - [Step 4 — Start the node](#step-4--start-the-node)
   - [Step 5 — Register on-chain](#step-5--register-on-chain)
   - [Step 6 — Verify](#step-6--verify)
8. [Provider Configuration Reference](#provider-configuration-reference)
9. [CLI Command Reference](#cli-command-reference)
10. [Tech Stack](#tech-stack)
11. [Repository Layout](#repository-layout)
12. [Smart Contract Addresses](#smart-contract-addresses)
13. [Error Reference](#error-reference)
14. [Troubleshooting](#troubleshooting)
15. [Documentation](#documentation)
16. [Contributing and License](#contributing-and-license)

---

## What is ZKai

ZKai routes inference requests from the caller to the gateway, through the Fly.io relay, and into a provider node that runs an enclave-backed runtime (`zkai-enclave`). The provider enclave executes the model request and computes a SHA-256 attestation hash for the result. The relay and provider host only see opaque payloads and routing metadata — the core trust boundary is the enclave process where model execution happens.

Payments are coordinated through Midnight preprod contracts with shielded DUST handling in `PaymentEscrow`. After inference, the provider bridge submits settlement and attestation transactions so job state and proof material are anchored on-chain. The provider market is managed through `ProviderRegistry`, and attestation records are anchored in `AttestationRegistry`, giving consumers a public verification path for who served the job and what was charged.

For developers, ZKai exposes an OpenAI-compatible HTTP endpoint at `POST /api/v1/chat/completions` plus a Python SDK (`zkai`) and a LangChain adapter (`ChatZKai`). Existing OpenAI integrations can migrate with minimal code change. Provider operators can run and register nodes with the companion CLI in `cli/`.

---

## Key Features

- **OpenAI-compatible API** — drop-in replacement for `openai` Python client and `ChatOpenAI` LangChain class.
- **Confidential inference** — model execution runs inside a Gramine enclave; plaintext prompts never leave the enclave boundary.
- **Verifiable attestation** — every inference job produces a SHA-256 attestation hash anchored in `AttestationRegistry` on Midnight preprod.
- **Shielded billing** — payment settlement uses Midnight's native shielded balance primitives via `PaymentEscrow`, so payment amounts are private.
- **Decentralized provider market** — any operator can join by running `zkai init && zkai start && zkai register`; providers are discoverable through `ProviderRegistry` on-chain.
- **No inbound ports required** — provider nodes connect outbound to the Fly.io relay over a persistent WebSocket, so no public IP or port forwarding is needed.
- **ZK proof generation** — a local `midnightnetwork/proof-server` sidecar handles proving for Midnight contract calls without depending on external proving infrastructure.

---

## Architecture

![ZKai System Architecture](architecture.drawio.png)

ZKai is organized into five layers: **Consumer**, **Gateway**, **Relay**, **Provider Node**, and **Midnight Blockchain**.

| Layer | Host | Purpose |
|---|---|---|
| Consumer | Anywhere | SDK / HTTP client that submits inference requests |
| Gateway | Vercel | Authentication, provider selection, job recording |
| Database | Neon PostgreSQL | Auth state, provider discovery, job telemetry |
| Relay | Fly.io | WebSocket bridge between gateway HTTP and provider connections |
| Provider — `zkai-enclave` | Provider machine | Ollama inference + attestation hash generation |
| Provider — `zkai-bridge` | Provider machine | Midnight wallet state + contract call coordination |
| ZK Proof Server | Provider machine (sidecar) | Local proof generation for Midnight contract flows |
| Midnight preprod | Blockchain | `ProviderRegistry`, `PaymentEscrow`, `AttestationRegistry` contracts |
| Frontend | Vercel (`zkai.vercel.app`) | Consumer dashboard, provider rankings, model explorer |

For the full architecture deep-dive including trust model, attestation model, and on-chain payment lifecycle see [architecture.md](architecture.md).

---

## How a Request Travels

```
Consumer
   │  POST /api/v1/chat/completions
   ▼
Gateway (Vercel)  ──── authenticates key, selects provider, creates job record
   │  POST /relay/:provider_id
   ▼
Relay (Fly.io)    ──── forwards payload over provider's outbound WebSocket
   │
   ▼
zkai-enclave      ──── runs Ollama inference, computes SHA-256 attestation hash
   │
   ▼
zkai-bridge       ──── posts deductBalance + postAttestation txs to Midnight
   │
   ▼
Midnight preprod  ──── confirms state; response travels back through relay → gateway → consumer
```

1. The consumer sends `POST /api/v1/chat/completions` with an API key or tNIGHT wallet-backed identity.
2. The gateway on Vercel authenticates the request, picks an active provider by model and reputation, and creates a pending job record.
3. The gateway posts to `/relay/:provider_id`; the relay forwards over the provider's persistent WebSocket connection.
4. `zkai-enclave` runs Ollama inference and computes a SHA-256 attestation hash for the completed response.
5. `zkai-bridge` submits payment settlement (`deductBalance`) and attestation anchoring (`postAttestation`) transactions to Midnight.
6. Once Midnight confirms state updates, the response returns through the same relay path to the gateway and back to the consumer.

The operator of the gateway, relay, and provider host sees only routing metadata and attestation hashes — not plaintext model state inside the enclave boundary.

---

## Roadmap

ZKai is currently an early-stage deployment on Midnight preprod rather than mainnet production. Development does not require dedicated SGX hardware because Gramine Direct Mode can be used for local enclave simulation.

| Phase | Description | Status |
|---|---|---|
| 1 | Local TEE simulation and Ollama inference inside Gramine | ✅ Complete |
| 2 | E2E request routing: Gateway → Relay → Enclave | ✅ Complete |
| 2.5 | Python SDK — OpenAI-compatible client | ✅ Complete |
| 3 | Midnight smart contracts: ProviderRegistry, PaymentEscrow, AttestationRegistry | ✅ Complete |
| 4 | ZK attestation proofs and shielded billing | ✅ Complete |
| 5 | Mainnet integration and public provider marketplace | 🔜 Planned |

---

## Quick Start — Using the API

Get an API key from the dashboard at **[zkai.vercel.app/dashboard](https://zkai.vercel.app/dashboard)**.

### Install the CLI (one-line)

If you only need the provider CLI binary (no Python environment required — uses Python zipapp):

```bash
curl -fsSL https://raw.githubusercontent.com/Eshan276/zkai/main/install.sh | bash
```

> **Security note:** always review scripts before piping them to bash. You can inspect the installer at the URL above before running it.

This installs `zkai` to `~/.local/bin/zkai`. Make sure `~/.local/bin` is on your `PATH`.

### HTTP (curl)

```bash
curl https://zkai.vercel.app/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:1.5b",
    "messages": [{"role": "user", "content": "What is a zero-knowledge proof?"}]
  }'
```

### Python SDK

```bash
pip install zkai
```

```python
import os
from zkai import ZKai

client = ZKai(
    api_key=os.environ["ZKAI_API_KEY"],
    base_url="https://zkai.vercel.app",
)

response = client.chat.completions.create(
    model="qwen2.5:1.5b",
    messages=[{"role": "user", "content": "What is a zero-knowledge proof?"}],
)

print(response.choices[0].message.content)
```

> **Security note:** never hard-code API keys in committed source. Store them in environment variables (e.g., `ZKAI_API_KEY`) and read them at runtime.

The response object follows the OpenAI chat completion shape:

| Field | Description |
|---|---|
| `response.id` | Unique job ID |
| `response.model` | Model that served the request |
| `response.choices[0].message.content` | Generated text |
| `response.usage` | Token usage (`prompt_tokens`, `completion_tokens`, `total_tokens`) |

#### Error handling

```python
import os
import requests
from zkai import ZKai, ZKaiAuthError, ZKaiAttestationError
from zkai.client import ZKaiNoProviderError

client = ZKai(api_key=os.environ["ZKAI_API_KEY"], base_url="https://zkai.vercel.app")

try:
    response = client.chat.completions.create(
        model="qwen2.5:1.5b",
        messages=[{"role": "user", "content": "Hello"}],
    )
except ZKaiAuthError as e:
    print(f"Auth failed: {e}")
except ZKaiNoProviderError as e:
    print(f"No provider available: {e}")
except ZKaiAttestationError as e:
    print(f"Attestation mismatch: {e}")
except requests.HTTPError as e:
    print(f"Upstream HTTP error: {e}")
```

### LangChain

```bash
pip install "zkai[langchain]"
```

```python
import os
from zkai import ChatZKai
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

llm = ChatZKai(model="qwen2.5-1.5b", api_key=os.environ["ZKAI_API_KEY"])

chain = (
    ChatPromptTemplate.from_messages([
        ("system", "Answer concisely."),
        ("human", "{question}"),
    ])
    | llm
    | StrOutputParser()
)

print(chain.invoke({"question": "Explain attestation in one sentence."}))
```

`ChatZKai` extends `BaseChatModel` and is a drop-in replacement for `ChatOpenAI`:

```python
# Before
from langchain_openai import ChatOpenAI
llm = ChatOpenAI(model="gpt-4o", api_key="sk-...")

# After
from zkai import ChatZKai
llm = ChatZKai(model="qwen2.5-1.5b", api_key=os.environ["ZKAI_API_KEY"])
```

---

## Quick Start — Running a Provider Node

A provider node runs two Docker services (`zkai-enclave` and `zkai-bridge`) and connects **outbound** to the relay — no inbound firewall rules or public IP required.

```
Your Node (outbound WS) → Fly.io Relay ← Gateway (Vercel) ← Consumer
        ↓
    Ollama inference
        ↓
    tNIGHT paid on-chain
```

### Prerequisites

| Requirement | Notes |
|---|---|
| Docker Engine + Docker Compose v2 | `docker compose version` to verify |
| Python 3.9+ | For the `zkai` CLI |
| 4 GB RAM minimum | 8 GB recommended for smooth model loading |
| Outbound internet access | No inbound ports needed |
| Midnight preprod wallet with tNIGHT | For gas and DUST; get tokens from the [faucet](https://faucet.midnight.network) |

### Step 1 — Clone & install the CLI

```bash
git clone https://github.com/Eshan276/zkai.git
cd zkai
pip install ./cli
zkai --help
```

### Step 2 — Initialize

```bash
zkai init
```

This single command:
- Fetches the relay URL and secret from the ZKai gateway
- Generates a new Midnight wallet (seed)
- Writes `deploy/.seed`, `deploy/.bridge-seed`, and `provider/.env` with all required config

> If Node.js is not installed locally, `zkai init` runs key generation inside Docker automatically.

### Step 3 — Fund your wallet

Your bridge wallet needs **tNIGHT** (Midnight preprod testnet tokens) for gas.

1. Start the bridge briefly to get your wallet address:

   ```bash
   zkai start
   zkai logs bridge | grep Address
   # Output: Address: mn_addr_preprod1...
   ```

2. Request tNIGHT from the faucet: **[faucet.midnight.network](https://faucet.midnight.network)**

3. Wait ~2 minutes for tokens to arrive.

> You need ~5 tNIGHT for gas. DUST (Midnight's gas token) is auto-generated from tNIGHT and takes 5–10 minutes on first boot.

### Step 4 — Start the node

```bash
zkai start
```

On first boot this:
1. Downloads the `qwen2.5:1.5b` model (~1 GB, cached in a Docker volume)
2. Starts the Ollama inference server
3. Syncs the bridge wallet with Midnight preprod (2–5 minutes)
4. Connects outbound to the Fly.io relay via WebSocket

Check status and watch logs:

```bash
zkai status
zkai logs           # all services
zkai logs bridge    # wallet sync progress
zkai logs enclave   # inference + relay connection
```

Wait for these log lines before proceeding:

```
[wallet:sync] isSynced=true
Wallet synced.
[relay] Connected to wss://zkai-relay.fly.dev
```

### Step 5 — Register on-chain

```bash
zkai register --model qwen2.5:1.5b --price 100
```

This:
- Fetches your enclave's TEE public key
- Auto-sets your endpoint to `https://zkai-relay.fly.dev/relay/<provider_id>`
- Registers in the ZKai gateway DB so consumers can discover you immediately
- Submits `registerProvider` to the Midnight `ProviderRegistry` contract (background)

Expected output:

```
Provider registered!
  TX:          submitted
  Provider ID: bce72e99...
  Endpoint:    https://zkai-relay.fly.dev/relay/bce72e99...
```

### Step 6 — Verify

```bash
zkai status
# Shows: Provider Dashboard: https://zkai.vercel.app/provider_dashboard?id=bce72e99...

curl https://zkai-relay.fly.dev/health
# {"status":"ok","providers":1}
```

Test inference through the gateway (requires a consumer API key):

```bash
curl -X POST https://zkai.vercel.app/api/v1/chat/completions \
  -H "Authorization: Bearer zkai-YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5:1.5b","messages":[{"role":"user","content":"Hello!"}]}'
```

---

## Provider Configuration Reference

`provider/.env` is written by `zkai init` and can be edited to customise the node:

| Variable | Default | Description |
|---|---|---|
| `ZKAI_AUTH_URL` | `https://zkai.vercel.app` | Central gateway URL |
| `ZKAI_RELAY_URL` | `https://zkai-relay.fly.dev` | Fly.io WebSocket relay URL |
| `ZKAI_RELAY_SECRET` | _(fetched automatically)_ | Shared secret for relay authentication |
| `ZKAI_PRICE_PER_REQUEST` | `100` | tNIGHT charged per inference |
| `OLLAMA_MODEL` | `qwen2.5:1.5b` | Model to run (see [ollama.com/library](https://ollama.com/library)) |
| `MAX_TOKENS` | `512` | Maximum tokens per response |

To change the active model, edit `OLLAMA_MODEL` in `provider/.env` and restart the enclave:

```bash
# Set OLLAMA_MODEL=llama3.2:3b in provider/.env, then:
zkai restart enclave
```

Ollama pulls the new model automatically on first inference.

---

## CLI Command Reference

Install with `pip install ./cli` (from the repository root) or via the [one-line installer](#install-the-cli-one-line).

```bash
zkai --help
```

| Command | Purpose | Key flags |
|---|---|---|
| `zkai init` | Guided first-time setup: writes env files and wallet seeds | `--dir/-d` |
| `zkai keygen` | Generate wallet seed and address material | — |
| `zkai start` | Start enclave + bridge + proof-server containers | `--dir/-d`, `--build`, `--logs/-l` |
| `zkai stop` | Stop provider containers | `--dir/-d` |
| `zkai restart` | Restart one or both services | `--dir/-d`, `service` (`enclave`/`bridge`) |
| `zkai logs` | Show container logs | `--dir/-d`, `service`, `--lines/-n`, `--follow/-f` |
| `zkai status` | Show container, wallet, and enclave health | `--dir/-d` |
| `zkai register` | Register provider endpoint, model, and price | `--dir/-d`, `--endpoint/-e`, `--model/-m`, `--price/-p` |
| `zkai deregister` | Remove provider from registry and gateway | `--dir/-d` |
| `zkai info` | Print provider ID, endpoint, and public key | `--dir/-d` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Gateway | Next.js App Router API routes on Vercel |
| Database | Neon PostgreSQL |
| Relay | Node.js + `ws` relay on Fly.io |
| TEE runtime | Gramine SGX / Direct Mode |
| Inference | Ollama (`qwen2.5:1.5b`, `llama3.2:3b`) |
| Attestation | SHA-256 response hash anchored on Midnight |
| Bridge | Node.js + Fastify (`zkai-bridge`) |
| ZK proofs | `midnightnetwork/proof-server` |
| Smart contracts | Compact language on Midnight preprod |
| Wallet | Midnight Wallet SDK + LevelDB private state |
| Client SDK | Python (`zkai`, OpenAI-compatible) |
| Provider CLI | Python Typer CLI in `cli/` (`zkai`) |
| Frontend | Next.js consumer app at `zkai.vercel.app` |
| Containerisation | Docker Compose |

---

## Repository Layout

```
zkai/
├── frontend/          # Next.js consumer app (zkai.vercel.app)
│   ├── app/           # App Router pages and API route handlers
│   │   ├── api/v1/chat/completions/  # OpenAI-compatible gateway inference route
│   │   ├── api/auth/  # Wallet challenge + API key issuance/verification
│   │   ├── api/escrow/  # Escrow balance/deposit/prove transaction routes
│   │   └── api/providers/  # Provider listing, register, deregister
│   ├── components/    # Shared UI components
│   └── lib/           # DB client, wallet helpers, contract mappings
├── provider/          # Provider node Docker Compose stack
│   ├── api/           # zkai-enclave (FastAPI + Ollama + attestation)
│   └── docker-compose.yml
├── bridge/            # zkai-bridge (Node.js + Fastify, Midnight wallet + contracts)
│   └── src/
│       └── routes/    # /payment, /registry, /attestation route groups
├── relay/             # Fly.io WebSocket relay service
├── contracts/         # Midnight Compact smart contracts
│   └── src/
│       ├── ProviderRegistry.compact
│       ├── PaymentEscrow.compact
│       └── AttestationRegistry.compact
├── sdk/               # Python client SDK (pip install zkai)
│   └── zkai/
│       ├── client.py  # ZKai and ChatZKai classes
│       ├── crypto.py  # X25519 + ChaCha20-Poly1305 for direct enclave mode
│       └── langchain.py  # LangChain BaseChatModel adapter
├── cli/               # Provider operator CLI (pip install ./cli)
│   └── zkai_cli/
│       └── main.py    # Typer commands: init, start, stop, register, ...
├── deploy/            # Wallet seed files and provider bootstrap config (gitignored)
├── scripts/           # Utility scripts
├── data/              # Static reference data
├── install.sh         # One-line CLI installer (zipapp download)
├── architecture.md    # Full architecture, trust model, and payment lifecycle
├── RUNBOOK.md         # Operational runbook for all services
└── README.md          # This file
```

---

## Smart Contract Addresses

Deployed on **Midnight preprod**:

| Contract | Address |
|---|---|
| `ProviderRegistry` | `70f8c6b8661f687631165f333b1e5bd53919ce2ba03e029dc112c5e4f09c657e` |
| `PaymentEscrow` | `c7bcfc56772be622e5e31e8cd84b53f1a4fb259568de7f94ae3c9d6a10dd44d4` |
| `AttestationRegistry` | `9dfc5a38a7c8dca27fdfcec4360a66991b491947f48761fc8454a52717f6ff6a` |

These values are also referenced in `provider/docker-compose.yml` and the frontend environment variables.

---

## Error Reference

| Exception (SDK) | Raised when |
|---|---|
| `ZKaiAuthError` | API key is invalid or missing for a protected endpoint |
| `ZKaiNoProviderError` | Gateway cannot select a provider for the requested model |
| `ZKaiAttestationError` | Returned attestation hash does not match expected computation or on-chain anchor |
| `requests.HTTPError` | Upstream gateway or provider returned a non-success status not wrapped by SDK exceptions |

---

## Troubleshooting

| Symptom | Likely cause | Action |
|---|---|---|
| `No providers available for model` | Provider not active or not registered | Re-run `zkai register`, verify model string and endpoint |
| Gateway returns `503 provider_offline` | Relay has no live WebSocket session for the provider | Restart enclave and confirm `ZKAI_RELAY_URL` / `ZKAI_RELAY_SECRET` in `provider/.env` |
| Bridge never reaches `synced=true` | Seed invalid, unfunded wallet, or network lag | Fund wallet at [faucet.midnight.network](https://faucet.midnight.network), verify seed format, wait full sync cycle |
| `Invalid or missing API key` | Wrong or revoked key | Issue a new key in the dashboard and retry |
| Attestation mismatch | Provider restart, stale state, or tampering | Retry once, then switch provider and investigate |
| `docker compose` starts but no inference | Model still downloading on first run | Wait for first model pull to complete (`zkai logs enclave`) |
| Proof-related tx failures | Proof server unavailable or wrong URL | Restart proof server (`docker logs zkai-proof-server`) and bridge |
| Bridge wallet not syncing | LevelDB state corruption | `docker volume rm provider_bridge_leveldb && zkai stop && zkai start` |
| Relay not connecting | Missing env vars | `zkai logs enclave | grep relay` — confirm `ZKAI_RELAY_URL` and `ZKAI_RELAY_SECRET` are set |
| DUST / "Insufficient funds" errors | DUST auto-generation still in progress | Wait 10 min after funding; DUST is generated from tNIGHT automatically |
| Proof server not responding (ARM64) | Image platform mismatch | Add `platform: linux/amd64` to the proof-server service in `docker-compose.yml` |
| `Provider already registered` | Each `zkai register` issues a new provider ID | Run `zkai register` again to create a fresh registration |

### Health check commands

| Component | Command | Healthy signal |
|---|---|---|
| Enclave | `curl http://localhost:8080/health` | `{"status":"ok", ...}` |
| Bridge | `curl http://localhost:7300/health` | `{"synced":true, ...}` |
| Relay | `curl https://zkai-relay.fly.dev/health` | `{"status":"ok","providers":<N>}` |
| Gateway | `curl https://zkai.vercel.app/api/relay-config` | Returns relay config object |

---

## Documentation

| Document | Description |
|---|---|
| [architecture.md](architecture.md) | Full system architecture, trust boundaries, and payment lifecycle |
| [sdk/README.md](sdk/README.md) | Python SDK reference, CLI commands, and bridge route surface |
| [frontend/README.md](frontend/README.md) | Frontend + gateway development setup and environment variables |
| [provider/README.md](provider/README.md) | Provider node onboarding and operational commands |
| [RUNBOOK.md](RUNBOOK.md) | Operational runbook for gateway, relay, and provider services |

---

## Contributing and License

Contributions are welcome through pull requests. For significant changes, open an issue first to align on scope and implementation details. Follow the existing code style conventions in the repository (TypeScript with ESLint in `frontend/` and `bridge/`; Python formatting and lint standards in `sdk/` and `cli/`).

License: MIT.
