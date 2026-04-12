---
mode: agent
tools:
  - codebase
  - editFiles
description: >
  Generate sdk/README.md for ZKai.
  Covers the Python zkai client library, LangChain adapter, the provider CLI (cli/),
  and the bridge API surface. No emojis. Code examples throughout.
---

Generate `sdk/README.md`. Overwrite any existing content.

Before writing, inspect using the codebase tool:
- `sdk/` — Python package structure, `setup.py` or `pyproject.toml`, existing docstrings, client class
- `cli/` — CLI entry point, available subcommands and flags
- `bridge/` — route handlers to understand `deductBalance`, `deposit`, `register`, `deregister`, `submitAttestation` endpoints
- `provider/` — Flask routes to understand what the enclave exposes (`/health`, inference endpoint)

Use what you actually find. If source is sparse, write based on the architecture described in the workspace instructions.

---

## Required sections (in this order)

### H1: `ZKai SDK`

One sentence: the ZKai SDK is an OpenAI-compatible Python client for private AI inference on the Midnight blockchain.

---

### Overview

Three paragraphs:

1. What the SDK does: `client.chat.completions.create()` handles gateway auth, provider selection, the relay routing, response receipt, and attestation verification transparently. From the caller's perspective it behaves identically to the OpenAI Python client.

2. Migration story: existing OpenAI integrations require two line changes. LangChain users swap one import.

3. The companion tooling: the `cli/` directory provides `zkai-provider`, a command-line tool for operators running provider nodes. It automates Ollama model setup, Docker Compose startup, Midnight contract registration, and relay connection.

---

### Installation

```bash
pip install zkai
```

Python 3.9 or later required. Virtual environment recommended.

LangChain adapter:
```bash
pip install "zkai[langchain]"
```

Provider CLI:
```bash
pip install "zkai[provider]"
```

---

### Authentication

Two options — show both:

```python
# Option 1 — pass directly
from zkai import ZKai
client = ZKai(api_key="your-api-key")

# Option 2 — environment variable (recommended)
# export ZKAI_API_KEY=your-api-key
client = ZKai()
```

A security note in a blockquote: never hardcode API keys in source. Use environment variables or a secrets manager.

Get an API key from the Consumer Dashboard at `https://zkai.vercel.app`.

---

### Python Client

#### Initialisation

```python
from zkai import ZKai

client = ZKai(
    api_key="your-api-key",            # or set ZKAI_API_KEY
    gateway_url="https://zkai.vercel.app",  # default; override for self-hosted
    max_price_per_token=0.0001,        # skip providers above this DUST/token price
    timeout=60,                        # request timeout in seconds
)
```

A parameter table:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `api_key` | `str` | `$ZKAI_API_KEY` | ZKai API key from the Consumer Dashboard |
| `gateway_url` | `str` | `https://zkai.vercel.app` | Gateway base URL |
| `max_price_per_token` | `float` | `0.001` | Maximum provider price in DUST per token |
| `provider_id` | `str \| None` | `None` | Pin to a specific provider; skips gateway selection |
| `timeout` | `int` | `60` | Request timeout in seconds |
| `verify_attestation` | `bool` | `True` | Verify attestation hash after every response |

---

#### Chat Completions

```python
response = client.chat.completions.create(
    model="qwen2.5:1.5b",
    messages=[
        {"role": "system", "content": "Answer concisely."},
        {"role": "user", "content": "What is a zero-knowledge proof?"}
    ],
    temperature=0.7,
    max_tokens=512,
)

print(response.choices[0].message.content)
```

Available models: `qwen2.5:1.5b`, `llama3.2:3b`. The gateway selects a provider that supports the requested model.

The return value is a `ChatCompletion` object matching the OpenAI schema exactly. All existing code that reads `response.choices[0].message.content` works without modification.

---

#### Streaming

```python
stream = client.chat.completions.create(
    model="qwen2.5:1.5b",
    messages=[{"role": "user", "content": "Count to ten slowly."}],
    stream=True,
)

for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

---

#### Job Receipts

After each request, a receipt is attached to the response:

```python
response = client.chat.completions.create(
    model="qwen2.5:1.5b",
    messages=[{"role": "user", "content": "Hello"}],
)

receipt = response.zkai_receipt
print(receipt.job_id)               # on-chain job identifier
print(receipt.provider_id)          # provider that handled the request
print(receipt.token_count)          # total tokens (input + output)
print(receipt.dust_cost)            # DUST deducted
print(receipt.attestation_hash)     # SHA-256 of the response
print(receipt.attestation_verified) # True if hash matches AttestationRegistry
```

A table of receipt fields:

| Field | Type | Description |
|---|---|---|
| `job_id` | `str` | On-chain job identifier |
| `provider_id` | `str` | Provider that handled the request |
| `token_count` | `int` | Total tokens processed |
| `dust_cost` | `float` | DUST deducted from balance |
| `attestation_hash` | `str` | SHA-256 hash of the response from the enclave |
| `attestation_verified` | `bool` | Whether the hash matches the on-chain `AttestationRegistry` record |
| `model` | `str` | Model used for inference |

---

#### Error Handling

```python
from zkai import ZKai
from zkai.exceptions import (
    ZKaiAttestationError,
    ZKaiInsufficientFundsError,
    ZKaiNoProvidersError,
    ZKaiTimeoutError,
    ZKaiGatewayError,
)

client = ZKai(api_key="...")

try:
    response = client.chat.completions.create(
        model="qwen2.5:1.5b",
        messages=[{"role": "user", "content": "Hello"}],
    )
except ZKaiAttestationError as e:
    # The SHA-256 hash returned by the enclave does not match the on-chain record.
    print(f"Attestation mismatch: {e}")
except ZKaiInsufficientFundsError:
    print("DUST balance too low. Top up via the Consumer Dashboard.")
except ZKaiNoProvidersError:
    print("No providers available for the requested model and price.")
except ZKaiTimeoutError:
    print("Provider did not respond within the timeout window.")
except ZKaiGatewayError as e:
    print(f"Gateway error {e.status_code}: {e.message}")
```

Exception table:

| Exception | When raised |
|---|---|
| `ZKaiAttestationError` | Enclave SHA-256 hash does not match on-chain `AttestationRegistry` record |
| `ZKaiInsufficientFundsError` | DUST balance is below the estimated job cost |
| `ZKaiNoProvidersError` | No registered providers match the model and price filter |
| `ZKaiTimeoutError` | Provider node did not respond before the timeout |
| `ZKaiGatewayError` | Gateway returned a non-200 HTTP status |

---

### LangChain Adapter

#### Installation

```bash
pip install "zkai[langchain]"
```

#### Migration from ChatOpenAI

```python
# Before
from langchain_openai import ChatOpenAI
llm = ChatOpenAI(model="gpt-4o", api_key="sk-...")

# After — one import change
from zkai.langchain import ChatZKai
llm = ChatZKai(model="qwen2.5:1.5b", api_key="your-api-key")
```

All chains, agents, and RAG pipelines that use the `llm` object continue to work unchanged.

#### LCEL Chain Example

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from zkai.langchain import ChatZKai

llm = ChatZKai(model="qwen2.5:1.5b", api_key="your-api-key")

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

---

### Provider CLI (`zkai-provider`)

The CLI lives in `cli/` and is installed as `zkai-provider` when you run `pip install "zkai[provider]"`.

#### What the CLI Automates

A short paragraph: `zkai-provider start` orchestrates the full provider node setup — Ollama model pull, Docker Compose startup (enclave + bridge containers), Midnight contract registration via the bridge, and outbound relay connection. Operators do not need to configure any of these steps manually.

#### Prerequisites

Numbered list:
1. Docker Engine 24+ and Docker Compose v2. Verify: `docker compose version`
2. Ollama installed on the host or accessible within the container. The CLI pulls models automatically.
3. At least 8 GB RAM (Ollama + enclave overhead) and 5 GB free disk space
4. A Midnight wallet private key with sufficient DUST to stake
5. Network access to the ZKai relay (outbound only — no inbound ports required)

#### Starting a Provider Node

```bash
zkai-provider start \
  --model qwen2.5:1.5b \
  --wallet 0xYOUR_WALLET_KEY \
  --stake 100 \
  --price 0.0001
```

Flag reference table:

| Flag | Required | Default | Description |
|---|---|---|---|
| `--model` | Yes | — | Ollama model to serve (`qwen2.5:1.5b` or `llama3.2:3b`) |
| `--wallet` | Yes | `$ZKAI_WALLET_KEY` | Midnight wallet private key |
| `--stake` | Yes | — | DUST to stake on ProviderRegistry |
| `--price` | Yes | — | Price per token in DUST |
| `--relay-url` | No | Production relay | Relay WebSocket URL |
| `--port` | No | `5000` | Local enclave Flask port |
| `--bridge-port` | No | `3001` | Local bridge Fastify port |
| `--data-dir` | No | `~/.zkai/provider` | Directory for model weights and state |

What `zkai-provider start` does, as a numbered list:
1. Pulls the Ollama model into `--data-dir` if not already present
2. Writes a `docker-compose.yml` with the `zkai-enclave` and `zkai-bridge` service definitions
3. Starts both containers; the bridge initialises the Midnight Wallet SDK
4. Calls `register` on the Midnight `ProviderRegistry` contract with stake and price
5. Opens an outbound WebSocket connection to the relay and begins receiving inference requests

#### Monitoring

```bash
zkai-provider status    # uptime, jobs completed, DUST earned, reputation
zkai-provider logs      # stream container logs
zkai-provider logs --tail 50 --service enclave   # enclave container only
zkai-provider logs --tail 50 --service bridge    # bridge container only
```

#### Stopping and Deregistering

```bash
zkai-provider stop
```

Gracefully stops both containers and calls `deregister` on `ProviderRegistry`. Staked DUST is returned minus any slashing.

A blockquote warning: stopping while jobs are in flight will trigger the dispute timeout for those jobs. Check `zkai-provider status` and wait for active job count to reach zero before stopping.

---

### Bridge API Reference

The `zkai-bridge` (Node.js / Fastify) exposes an internal HTTP API consumed by the enclave and the CLI. This section documents the surface for developers building integrations.

Base URL: `http://localhost:3001` (default bridge port on the provider node)

A table of routes:

| Method | Path | Description |
|---|---|---|
| `POST` | `/payment/deductBalance` | Deduct DUST for a completed job from `PaymentEscrow` |
| `POST` | `/payment/deposit` | Deposit DUST into the provider wallet |
| `POST` | `/registry/register` | Register provider on Midnight `ProviderRegistry` |
| `POST` | `/registry/deregister` | Remove provider and recover stake |
| `POST` | `/attestation/submitAttestation` | Submit SHA-256 hash + ZK proof to `AttestationRegistry` |
| `GET` | `/health` | Bridge health and wallet sync status |

For each route, write one sentence describing the request body and what it does. Do not reproduce implementation code — describe the contract.

**`POST /payment/deductBalance`** — accepts a job ID and token count; calls the `PaymentEscrow` contract to release the pre-locked DUST to the provider after inference completes.

**`POST /payment/deposit`** — accepts a DUST amount and transfers it into the provider's wallet from an external source.

**`POST /registry/register`** — accepts stake amount, price per token, model list, and endpoint URL; publishes the provider to the on-chain registry.

**`POST /registry/deregister`** — removes the provider from the registry and returns stake (subject to slashing rules).

**`POST /attestation/submitAttestation`** — accepts a job ID and SHA-256 attestation hash; calls the ZK Proof Server on port 6300 to generate a proof, then submits both to the `AttestationRegistry` contract.

**`GET /health`** — returns bridge uptime, wallet sync status, LevelDB cache size, and Midnight node connectivity.

---

### Migration Guide

#### From OpenAI Python Client

Step 1:
```bash
pip install zkai
```

Step 2 — change two lines:
```python
# Remove:
from openai import OpenAI
client = OpenAI(api_key="sk-...")

# Add:
from zkai import ZKai
client = ZKai(api_key="your-zkai-api-key")
```

Everything else is unchanged.

#### From LangChain ChatOpenAI

Step 1:
```bash
pip install "zkai[langchain]"
```

Step 2 — change one import:
```python
# Remove:
from langchain_openai import ChatOpenAI
llm = ChatOpenAI(model="gpt-4o", api_key="sk-...")

# Add:
from zkai.langchain import ChatZKai
llm = ChatZKai(model="qwen2.5:1.5b", api_key="your-zkai-api-key")
```

---

### Related

- [../README.md](../README.md) — project overview and quick start
- [../architecture.md](../architecture.md) — full system architecture
- [../frontend/README.md](../frontend/README.md) — Consumer Dashboard setup
- [../RUNBOOK.md](../RUNBOOK.md) — operational runbook for providers

---

## Formatting constraints

- No emojis
- All Python code in fenced `python` blocks
- All shell commands in fenced `bash` blocks
- Tables for all parameter and route references
- File ends with a newline
