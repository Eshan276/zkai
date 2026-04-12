---
mode: agent
tools:
  - codebase
  - editFiles
description: >
  Generate the root README.md for the ZKai repository.
  Covers project identity, proof of concept, request flow, quick starts for
  users and providers, tech stack, and links to deeper documentation.
  No emojis. No inline HTML. Visually clean markdown.
---

Generate `README.md` at the repository root. Overwrite any existing content.

---

## Required sections (in this order)

### Header block

- H1: `ZKai`
- Tagline directly below (plain text, no heading): `Decentralized private AI inference on the Midnight blockchain.`
- Three shields.io static badges: License (MIT), Status (Preprod), and the live URL badge linking to `https://zkai.vercel.app`. Keep the row to three badges.
- A paragraph (3–5 sentences) answering: what is ZKai, what problem it solves, who it is for.

---

### What is ZKai

Three paragraphs — prose only, no bullet points.

**Paragraph 1 — Privacy guarantee:**
Describe how inference requests travel from the caller through a hosted gateway, over a WebSocket relay, into a Trusted Execution Environment running on the provider's Docker node. The enclave computes a SHA-256 attestation of the response. The operator of the infrastructure at every layer — gateway, relay, provider host — cannot read prompt content.

**Paragraph 2 — Payment and trust:**
Explain shielded DUST escrow on Midnight preprod. Describe how the ZK Proof Server generates a proof that is anchored in the `AttestationRegistry` contract on-chain, so users can verify that the correct model ran and the correct amount was charged.

**Paragraph 3 — Developer experience:**
ZKai exposes an OpenAI-compatible API (`POST /api/v1/chat/completions`) and a Python SDK. Changing two lines of code migrates an existing OpenAI integration to private inference. LangChain users can swap `ChatOpenAI` for `ChatZKai` with one import change.

---

### Proof of Concept

One paragraph explaining that this is an early-stage system deployed on Midnight preprod (not mainnet). The live gateway at `zkai.vercel.app` demonstrates the full end-to-end flow. Real Intel SGX hardware is not required for development; Gramine Direct Mode provides the enclave isolation layer locally.

Then a phase table:

| Phase | Description | Status |
|---|---|---|
| 1 | Local TEE simulation and Ollama inference inside Gramine | Complete |
| 2 | E2E request routing: Gateway → Relay → Enclave | Complete |
| 2.5 | Python SDK — OpenAI-compatible client | In Progress |
| 3 | Midnight smart contracts: ProviderRegistry, PaymentEscrow, AttestationRegistry | In Progress |
| 4 | ZK attestation proofs and shielded billing | In Progress |
| 5 | Mainnet integration and public provider marketplace | Planned |

---

### How a Request Travels

A numbered list (the 6-step request flow). Keep each step to one sentence:

1. The consumer sends `POST /api/v1/chat/completions` with an API key or tNIGHT wallet auth.
2. The Gateway on Vercel authenticates the request, selects a provider by reputation and model, and logs the job.
3. The Gateway posts to the Relay on Fly.io (`/relay/:provider_id`); the Relay forwards over WebSocket to the provider node.
4. The `zkai-enclave` container runs Ollama inference and computes a SHA-256 attestation of the response.
5. The `zkai-bridge` container calls the ZK Proof Server, then calls `deductBalance` and `submitAttestation` on Midnight.
6. The transaction is confirmed on-chain; the response returns on the same WebSocket path to the caller.

After the list, one sentence: "The operator of the gateway, relay, and provider host sees only ciphertext payloads and attestation hashes — never plaintext content."

---

### Quick Start — Using the API

Three options, each as a small subsection (`####`).

#### API Key (HTTP)

```bash
curl https://zkai.vercel.app/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:1.5b",
    "messages": [{"role": "user", "content": "What is a zero-knowledge proof?"}]
  }'
```

#### Python SDK

```bash
pip install zkai
```

```python
from zkai import ZKai

client = ZKai(api_key="YOUR_API_KEY")

response = client.chat.completions.create(
    model="qwen2.5:1.5b",
    messages=[{"role": "user", "content": "What is a zero-knowledge proof?"}]
)

print(response.choices[0].message.content)
```

Note: `api_key` can also be set via the `ZKAI_API_KEY` environment variable.

#### LangChain

```python
from zkai.langchain import ChatZKai

llm = ChatZKai(model="qwen2.5:1.5b", api_key="YOUR_API_KEY")
```

All LangChain chains, agents, and RAG pipelines that use `ChatOpenAI` work unchanged with `ChatZKai`.

---

### Quick Start — Running a Provider Node

One paragraph: providers run two Docker containers (zkai-enclave and zkai-bridge) that connect outward to the relay. No inbound firewall rules are needed.

Then the CLI quickstart:

```bash
pip install zkai-provider

zkai-provider start \
  --model qwen2.5:1.5b \
  --wallet 0xYOUR_WALLET_KEY \
  --stake 100 \
  --price 0.0001
```

A four-point numbered list of what this command does:
1. Pulls the specified Ollama model if not already present
2. Starts the `zkai-enclave` (Flask) and `zkai-bridge` (Fastify) containers via Docker Compose
3. Registers the provider on the Midnight `ProviderRegistry` contract with the given stake and price per token
4. Connects the node outbound to the relay; the endpoint URL is registered on-chain

---

### Tech Stack

Two-column table covering every layer:

| Layer | Technology |
|---|---|
| Gateway | Next.js API routes on Vercel |
| Database | Neon PostgreSQL |
| Relay | Node.js WebSocket server on Fly.io |
| TEE runtime | Gramine SGX / Direct Mode |
| Inference | Ollama — qwen2.5:1.5b, llama3.2:3b |
| Attestation | SHA-256 of response anchored on Midnight |
| Bridge | Node.js / Fastify (zkai-bridge) |
| ZK proofs | midnightnetwork/proof-server |
| Smart contracts | Compact language on Midnight preprod |
| Wallet | Midnight Wallet SDK + LevelDB cache |
| Client SDK | Python (zkai, OpenAI-compatible) |
| Provider CLI | cli/ |
| Frontend | Next.js (zkai.vercel.app) |
| Containerisation | Docker Compose |

---

### Documentation

| Document | Description |
|---|---|
| [architecture.md](architecture.md) | Full system architecture — components, data flow, trust model |
| [sdk/README.md](sdk/README.md) | Python SDK reference, CLI, and bridge API |
| [frontend/README.md](frontend/README.md) | Frontend and gateway local development setup |
| [RUNBOOK.md](RUNBOOK.md) | Operational runbook for gateway, relay, and provider |
| [DEVPLAN.md](DEVPLAN.md) | Development phase plan |

---

### Contributing and License

Short contributing paragraph: contributions are welcome via pull request. Open an issue first for significant changes. Follow the existing code style (TypeScript with ESLint, Python with Black).

License: MIT.

---

## Formatting constraints

- No emojis
- No inline HTML
- Section dividers with `---` between H2 sections
- Code blocks with language specifiers
- File ends with a newline
