# ZKai

Decentralized private AI inference on the Midnight blockchain.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![Status: Preprod](https://img.shields.io/badge/Status-Preprod-orange.svg)](https://zkai.vercel.app) [![Live: zkai.vercel.app](https://img.shields.io/badge/Live-zkai.vercel.app-black?logo=vercel)](https://zkai.vercel.app)

ZKai is a decentralized inference network that combines confidential execution with shielded payment settlement. It is built for developers and teams that need LLM outputs without exposing prompts or response data to third-party infrastructure. Consumers submit OpenAI-style requests through a hosted gateway, and providers run inference inside enclave-isolated infrastructure. Every completed job produces an attestation hash that can be checked against Midnight state. The result is private inference with verifiable billing and a familiar developer API.

---

## What is ZKai

ZKai routes inference requests from the caller to the gateway, through the Fly.io relay, and into a provider node that runs an enclave-backed runtime (`zkai-enclave`). The provider enclave executes the model request and computes a SHA-256 attestation hash for the result. The relay and provider host only route opaque payloads and metadata needed for delivery. The core trust boundary is the enclave process where model execution happens.

Payments are coordinated through Midnight preprod contracts with shielded DUST handling in `PaymentEscrow`. After inference, the provider bridge submits settlement and attestation transactions so job state and proof material are anchored on-chain. The provider market is managed through `ProviderRegistry`, and attestation records are anchored in `AttestationRegistry`. This gives consumers a public verification path for who served the job and what was charged.

For developers, ZKai exposes an OpenAI-compatible HTTP endpoint at `POST /api/v1/chat/completions` plus a Python SDK (`zkai`) and a LangChain adapter (`ChatZKai`). Existing OpenAI integrations can migrate with minimal code change. LangChain flows can keep the same chain/agent structure and swap model imports. Provider operators can run and register nodes with the companion CLI in `cli/`.

---

## Proof of Concept

ZKai is currently an early-stage deployment on Midnight preprod rather than mainnet production. The public gateway at `https://zkai.vercel.app` demonstrates request routing, provider discovery, attestation posting, and payment settlement. Development does not require dedicated SGX hardware because Gramine Direct Mode can be used for local enclave simulation while preserving the same service boundaries.

| Phase | Description | Status |
|---|---|---|
| 1 | Local TEE simulation and Ollama inference inside Gramine | Complete |
| 2 | E2E request routing: Gateway -> Relay -> Enclave | Complete |
| 2.5 | Python SDK - OpenAI-compatible client | Complete |
| 3 | Midnight smart contracts: ProviderRegistry, PaymentEscrow, AttestationRegistry | Complete |
| 4 | ZK attestation proofs and shielded billing | Complete |
| 5 | Mainnet integration and public provider marketplace | Planned |

---

## How a Request Travels

1. The consumer sends `POST /api/v1/chat/completions` with an API key or tNIGHT wallet-backed identity.
2. The gateway on Vercel authenticates the request, chooses a provider by model and reputation, and creates a job record.
3. The gateway posts to the relay route (`/relay/:provider_id`), and the relay forwards over the provider's persistent WebSocket connection.
4. The `zkai-enclave` container runs Ollama inference and computes a SHA-256 attestation hash for the completed response.
5. The `zkai-bridge` container submits payment settlement (`deductBalance`) and attestation anchoring (`postAttestation`) transactions to Midnight.
6. Once Midnight confirms state updates, the response returns through the same relay path to the gateway and back to the consumer.

The operator of the gateway, relay, and provider host sees only routing metadata and attestation hashes, not plaintext model state inside the enclave boundary.

---

## Quick Start - Using the API

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

client = ZKai(
    api_key="YOUR_API_KEY",
    base_url="https://zkai.vercel.app",
)

response = client.chat.completions.create(
    model="qwen2.5:1.5b",
    messages=[{"role": "user", "content": "What is a zero-knowledge proof?"}],
)

print(response.choices[0].message.content)
```

Note: keep your key in an environment variable (for example `ZKAI_API_KEY`) and pass it into the client at runtime.

#### LangChain

```python
from zkai import ChatZKai

llm = ChatZKai(model="qwen2.5-1.5b", api_key="YOUR_API_KEY")
```

LangChain chains, agents, and RAG pipelines that already use a chat model interface can migrate to `ChatZKai` with minimal changes.

---

## Quick Start - Running a Provider Node

A provider node runs two Docker services (`zkai-enclave` and `zkai-bridge`) and connects outbound to the relay, so inbound firewall ports are not required.

```bash
git clone https://github.com/Eshan276/zkai.git
cd zkai

pip install ./cli

zkai init
zkai start
zkai register --model qwen2.5:1.5b --price 100
```

1. Pulls and caches the configured Ollama model on first start.
2. Starts `zkai-enclave` and `zkai-bridge` with Docker Compose.
3. Registers the provider in gateway discovery and submits on-chain `ProviderRegistry` registration.
4. Opens an outbound relay connection and exposes the provider endpoint via `/relay/<provider_id>`.

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

Contributions are welcome through pull requests. For significant changes, open an issue first so we can align on scope and rollout details. Follow the existing code style conventions in the repository (TypeScript with ESLint, Python with formatting/lint standards in each package).

License: MIT.
