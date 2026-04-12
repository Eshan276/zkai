# ZKai SDK

The ZKai SDK is an OpenAI-compatible Python client for private AI inference workflows integrated with Midnight network components.

## Overview

The `zkai` Python package exposes a familiar `client.chat.completions.create(...)` interface so existing OpenAI-style code can migrate with minimal changes. In gateway mode, the client sends requests to `/api/v1/chat/completions` and returns a standard chat completion object with `choices[0].message.content` access patterns.

The package also supports direct provider mode (`provider_endpoint`) for enclave-to-client encrypted calls (`/infer`) using X25519 + ChaCha20-Poly1305 primitives in `sdk/zkai/crypto.py`. In this path, the SDK can verify enclave attestation reports and optionally compare hashes against on-chain attestation state when contract metadata is provided.

Companion operator tooling lives in `cli/` as a separate Python package (`zkai-cli`) that installs the `zkai` command. It automates provider bootstrap (`init`), container lifecycle (`start`, `status`, `logs`), and registry operations (`register`, `deregister`) against the bridge and Midnight preprod.

## Installation

```bash
pip install zkai
```

`zkai` currently requires Python `3.11+` (see `sdk/pyproject.toml`).

Optional LangChain adapter dependencies:

```bash
pip install "zkai[langchain]"
```

Provider CLI (from this repository):

```bash
pip install ./cli
```

## Authentication

Two common patterns:

```python
# Option 1: pass key directly
from zkai import ZKai

client = ZKai(api_key="your-api-key", base_url="https://zkai.vercel.app")
```

```python
# Option 2: read from env explicitly in your app
import os
from zkai import ZKai

client = ZKai(
    api_key=os.getenv("ZKAI_API_KEY"),
    base_url="https://zkai.vercel.app",
)
```

> Never hardcode API keys in committed source. Use environment variables or a secrets manager.

Get API keys from the dashboard at `https://zkai.vercel.app/dashboard`.

## Python Client

### Initialisation

```python
from zkai import ZKai

client = ZKai(
    api_key="your-api-key",                 # optional in open dev mode
    base_url="https://zkai.vercel.app",     # default in code: https://zkai.dev
    provider_endpoint=None,                   # set for direct enclave mode
    max_price=0.001,                          # provider price filter (direct/provider mode)
    min_reputation=0.0,                       # provider reputation floor
    registry_contract=None,                   # optional on-chain provider discovery contract
    attestation_contract=None,                # optional on-chain attestation lookup contract
    skip_attestation=False,                   # disable attestation verification (not recommended)
)
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `api_key` | `str | None` | `None` | API key sent as `X-API-Key` when present |
| `base_url` | `str | None` | `https://zkai.dev` | Gateway base URL used in gateway mode |
| `provider_endpoint` | `str | None` | `None` | Direct provider URL (`/infer` mode), bypasses gateway |
| `max_price` | `float | None` | `None` | Upper bound for provider price filtering |
| `min_reputation` | `float` | `0.0` | Minimum provider reputation |
| `registry_contract` | `str | None` | `None` | Provider registry contract for indexer-based discovery |
| `attestation_contract` | `str | None` | `None` | Attestation contract for hash verification lookup |
| `skip_attestation` | `bool` | `False` | Skips attestation checks when `True` |

### Chat Completions

```python
from zkai import ZKai

client = ZKai(api_key="your-api-key", base_url="https://zkai.vercel.app")

response = client.chat.completions.create(
    model="qwen2.5:1.5b",
    messages=[
        {"role": "system", "content": "Answer concisely."},
        {"role": "user", "content": "What is a zero-knowledge proof?"},
    ],
)

print(response.id)
print(response.model)
print(response.choices[0].message.content)
print(response.usage)
```

The return object is a dataclass-compatible OpenAI-style shape:

- `ChatCompletion.id`
- `ChatCompletion.object`
- `ChatCompletion.model`
- `ChatCompletion.choices[]`
- `ChatCompletion.usage`

The current client implementation is non-streaming. Extra keyword arguments are accepted for compatibility but not interpreted by SDK logic.

### Direct Provider Mode (Encrypted)

```python
from zkai import ZKai

client = ZKai(
    api_key="your-api-key",
    provider_endpoint="http://localhost:8080",
    skip_attestation=False,
)

response = client.chat.completions.create(
    model="qwen2.5-1.5b",
    messages=[{"role": "user", "content": "Hello from direct mode"}],
)

print(response.choices[0].message.content)
```

In this mode the SDK fetches `/pubkey`, encrypts prompt payloads, calls `/infer`, verifies attestation, and decrypts the enclave response.

### Error Handling

```python
import requests
from zkai import ZKai, ZKaiAuthError, ZKaiAttestationError
from zkai.client import ZKaiNoProviderError

client = ZKai(api_key="...", base_url="https://zkai.vercel.app")

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

| Exception | Raised when |
|---|---|
| `ZKaiAuthError` | API key is invalid or missing for protected endpoints |
| `ZKaiNoProviderError` | Gateway cannot select a provider for the requested model |
| `ZKaiAttestationError` | Returned attestation hash does not match expected computation/on-chain anchor |
| `requests.HTTPError` | Upstream gateway/provider returned non-success status not wrapped by SDK exceptions |

## LangChain Adapter

### Installation

```bash
pip install "zkai[langchain]"
```

### Migration from ChatOpenAI

```python
# Before
from langchain_openai import ChatOpenAI
llm = ChatOpenAI(model="gpt-4o", api_key="sk-...")

# After
from zkai import ChatZKai
llm = ChatZKai(model="qwen2.5-1.5b", api_key="your-api-key")
```

`ChatZKai` extends `BaseChatModel` and uses the same `invoke`/chain patterns expected by LangChain pipelines.

### LCEL Example

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from zkai import ChatZKai

llm = ChatZKai(model="qwen2.5-1.5b", api_key="your-api-key")

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

## Provider CLI (`cli/`)

The operational provider CLI is implemented in `cli/zkai_cli` and installs the `zkai` command.

```bash
pip install ./cli
zkai --help
```

### What the CLI Automates

`zkai init` prepares provider config and wallet seed files, `zkai start` launches enclave/bridge/proof-server containers, and `zkai register` publishes provider metadata for discovery and registry flows. Lifecycle commands (`stop`, `restart`, `logs`, `status`) wrap Docker Compose operations with provider-specific health checks.

### Prerequisites

1. Docker Engine with Compose v2 (`docker compose version`).
2. Python `3.9+` for `zkai-cli`.
3. Access to Midnight preprod with funded wallet seed for gas and DUST generation.
4. Outbound network access to relay and Midnight endpoints.

### Core Commands

```bash
zkai init
zkai keygen
zkai start --build
zkai status
zkai logs --follow
zkai register --model qwen2.5:1.5b --price 100
zkai info
zkai deregister
zkai stop
```

### Command/Flag Reference

| Command | Purpose | Key flags |
|---|---|---|
| `zkai init` | Guided first-time setup | `--dir/-d` |
| `zkai keygen` | Generate wallet seed/address material | none |
| `zkai start` | Start enclave + bridge containers | `--dir/-d`, `--build`, `--logs/-l` |
| `zkai stop` | Stop provider containers | `--dir/-d` |
| `zkai restart` | Restart one or both services | `--dir/-d`, `service` (`enclave`/`bridge`) |
| `zkai logs` | Show container logs | `--dir/-d`, `service`, `--lines/-n`, `--follow/-f` |
| `zkai status` | Show container/wallet/enclave health | `--dir/-d` |
| `zkai register` | Register provider endpoint/model/price | `--dir/-d`, `--endpoint/-e`, `--model/-m`, `--price/-p` |
| `zkai deregister` | Remove provider from registry | `--dir/-d` |
| `zkai info` | Print provider ID, endpoint, pubkey | `--dir/-d` |

## Bridge API Reference

`zkai-bridge` is a Fastify service in `bridge/` (default: `http://localhost:7300`) that exposes payment, registry, and attestation routes.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Returns bridge availability and wallet sync state/address |
| `POST` | `/payment/deposit` | Deposits amount into `PaymentEscrow` |
| `POST` | `/payment/deduct-balance` | Deducts per-job amount from consumer balance |
| `POST` | `/payment/withdraw` | Withdraws balance from escrow |
| `GET` | `/providers` | Lists active providers from bridge-side cache |
| `POST` | `/registry/register-provider` | Registers provider metadata and submits registry tx |
| `POST` | `/registry/deregister-provider` | Deregisters provider and marks it inactive |
| `POST` | `/attestation/post-attestation` | Anchors job attestation hash and model hash on-chain |

Route details:

- `POST /payment/deposit` accepts `{ amount }` and calls contract `deposit`.
- `POST /payment/deduct-balance` accepts `{ job_id, wallet_address, provider_id, amount }` and calls contract `deductBalance`.
- `POST /payment/withdraw` accepts `{ amount }` and calls contract `withdraw`.
- `POST /registry/register-provider` accepts `{ provider_id, pubkey, endpoint, model, price }` and submits provider registration.
- `POST /registry/deregister-provider` accepts `{ provider_id }` and removes provider state.
- `POST /attestation/post-attestation` accepts `{ job_id, attestation_hash, model_hash }` and posts attestation data to `AttestationRegistry`.

## Provider Enclave Endpoints

For integration context, the enclave service in `provider/api/main.py` exposes:

- `GET /pubkey`
- `POST /infer`
- `POST /v1/chat/completions`
- `GET /attestation`
- `GET /health`

The bridge and relay layers call these endpoints depending on direct mode vs gateway mode workflows.

## Migration Guide

### From OpenAI Python Client

```bash
pip install zkai
```

```python
# Before
from openai import OpenAI
client = OpenAI(api_key="sk-...")

# After
from zkai import ZKai
client = ZKai(api_key="your-zkai-api-key", base_url="https://zkai.vercel.app")
```

Existing `chat.completions.create(...)` calls can stay in the same place.

### From LangChain ChatOpenAI

```bash
pip install "zkai[langchain]"
```

```python
# Before
from langchain_openai import ChatOpenAI
llm = ChatOpenAI(model="gpt-4o", api_key="sk-...")

# After
from zkai import ChatZKai
llm = ChatZKai(model="qwen2.5-1.5b", api_key="your-zkai-api-key")
```

## Related

- [../README.md](../README.md) - project overview and quick start
- [../architecture.md](../architecture.md) - system architecture and trust model
- [../frontend/README.md](../frontend/README.md) - frontend/gateway local setup
- [../provider/README.md](../provider/README.md) - provider node operations
