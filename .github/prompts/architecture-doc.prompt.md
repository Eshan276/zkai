---
mode: agent
tools:
  - codebase
  - editFiles
description: >
  Generate architecture.md at the repository root for ZKai.
  A code-free document covering all system components, the 6-step request flow,
  the trust model, on-chain payment lifecycle, and the two-container provider design.
  No emojis. No fenced code blocks. Prose and tables only.
---

Generate `architecture.md` at the repository root. Overwrite any existing content.

## Critical constraints

- **Zero fenced code blocks.** This is a pure architecture document. All detail is in prose and tables.
- No emojis.
- The architecture diagram already exists at `architecture.drawio.png` in the root. Embed it immediately after the H1:
  `![ZKai System Architecture](architecture.drawio.png)`
- This document is for a developer who wants to understand the full system before reading any source code.

---

## Required sections (in this order)

### H1: `ZKai — System Architecture`

Embed the diagram image immediately after the heading (see above).

One paragraph (3–4 sentences) stating the purpose of this document and what the reader will understand after reading it.

---

### 1. System Overview

A prose section (4–6 sentences) giving the helicopter view:
- Five layers exist: Consumer, Gateway, Relay, Provider Node, and Midnight Blockchain
- The Gateway and frontend are hosted on Vercel; the Relay runs on Fly.io
- The Provider Node runs two Docker containers: `zkai-enclave` and `zkai-bridge`
- Midnight handles shielded payments, provider registry, and on-chain attestation anchoring
- No layer between the consumer and the enclave can read plaintext prompt content

---

### 2. Components

For each component, write a `####` subsection with a one-sentence purpose and a 3–5 sentence prose description of responsibility and interfaces. No code.

#### 2.1 Consumer (SDK / Application)

The caller. Can be the Python `zkai` SDK, a direct HTTP client using an API key, a tNIGHT wallet, or the ZKai frontend. Sends requests to `POST /api/v1/chat/completions`. Receives an OpenAI-compatible response object.

#### 2.2 Gateway (Vercel)

The hosted entry point for all inference requests. Responsibilities:
- API key and wallet authentication (`Auth & Key Verify`)
- Provider selection from the on-chain registry, weighted by reputation and model support
- Job logging to Neon PostgreSQL (`users`, `api_keys`, `jobs`, `providers`)
- Hosting the Consumer Dashboard (usage history, job receipts, provider browser)

The gateway does not perform inference. It authenticates, routes, and logs.

#### 2.3 Neon PostgreSQL

The operational database for the gateway. Stores user accounts, hashed API keys, job records (status, provider, cost, attestation hash), and a cached provider list. This is off-chain operational data; the source of truth for payments and attestation remains on Midnight.

#### 2.4 Relay (Fly.io)

A WebSocket hub deployed on Fly.io that sits between the gateway and provider nodes. The gateway sends an HTTP POST to `/relay/:provider_id`; the relay looks up the persistent WebSocket connection for that provider and forwards the payload. Each provider node opens an outbound WebSocket connection to the relay at startup. The relay sends a heartbeat every 30 seconds to detect dropped connections. This design means providers never need inbound firewall rules.

#### 2.5 Provider Node — zkai-enclave (Python / Flask)

The inference runtime running inside the Gramine TEE layer. Responsibilities:
- Serving the Ollama inference API for models `qwen2.5:1.5b` and `llama3.2:3b`
- Computing a SHA-256 hash of each response as the attestation payload
- Exposing `/health` with hardware information (CPU, RAM, GPU availability)
- Operating in Gramine SGX mode (production) or Gramine Direct Mode (development) — the host OS cannot observe enclave memory

The enclave does not handle payments or on-chain interactions.

#### 2.6 Provider Node — zkai-bridge (Node.js / Fastify)

The on-chain coordination service running alongside the enclave in the same Docker Compose stack. Responsibilities:
- Managing the Midnight Wallet SDK with a LevelDB cache for state persistence
- `deductBalance` and `deposit` payment routes — interact with the `PaymentEscrow` contract
- `register` and `deregister` registry routes — interact with the `ProviderRegistry` contract
- `submitAttestation` route — posts the SHA-256 response hash to the `AttestationRegistry` contract
- Generating ZK proofs by calling the `midnightnetwork/proof-server` running on port 6300

The bridge connects the enclave's attestation output to the Midnight blockchain.

#### 2.7 ZK Proof Server

A sidecar service (`midnightnetwork/proof-server`) running on port 6300, managed by the bridge. The bridge calls this server with attestation and billing inputs; the server returns a ZK proof. The proof is included in the `submitAttestation` call to Midnight, allowing the `AttestationRegistry` contract to verify correctness without revealing content.

#### 2.8 Midnight Smart Contracts (Compact Language — Preprod)

Three contracts on the Midnight blockchain:

A table:

| Contract | Responsibility |
|---|---|
| `ProviderRegistry` | Provider registration, staking, discovery, reputation, deregistration |
| `PaymentEscrow` | Shielded DUST locking, job lifecycle, dispute window, payment release |
| `AttestationRegistry` | On-chain anchoring of ZK proof + SHA-256 attestation hash per job |

All balances in `PaymentEscrow` are shielded — Midnight's native ZK infrastructure handles privacy automatically.

#### 2.9 Frontend (Next.js — zkai.vercel.app)

The web interface for consumers. Provides: wallet connection (tNIGHT), provider browser (reputation, price, model), prompt submission, response display, and job receipt viewing. Deployed on Vercel alongside the gateway API routes. The frontend communicates only with the gateway — it never speaks directly to the relay or provider.

---

### 3. Request Flow — Step by Step

A numbered prose walkthrough of a complete inference request. One to two sentences per step.

1. **Consumer → Gateway.** The consumer sends `POST /api/v1/chat/completions` with an API key or wallet auth header.

2. **Gateway authenticates and routes.** The gateway verifies the credential against Neon PostgreSQL, selects a provider from the registry (weighted by reputation and model availability), and logs a job record with status `pending`.

3. **Gateway → Relay → Provider.** The gateway posts the request payload to `/relay/:provider_id` on the Fly.io relay. The relay looks up the persistent WebSocket connection for that provider and forwards the payload.

4. **Enclave infers and attests.** The `zkai-enclave` container receives the payload, runs Ollama inference against the requested model, and computes a SHA-256 hash of the response. This hash becomes the attestation payload.

5. **Bridge generates ZK proof and submits on-chain.** The `zkai-bridge` container receives the attestation hash from the enclave, calls the ZK Proof Server on port 6300 to generate a proof, then calls `deductBalance` on `PaymentEscrow` and `submitAttestation` on `AttestationRegistry` with the proof attached.

6. **Transaction confirmed; response returned.** Midnight confirms the transaction. The response travels back over the WebSocket relay to the gateway, which updates the job record to `complete` and returns the response to the consumer.

After the numbered list, add: "The gateway, relay, and provider host OS observe only encrypted payloads and attestation hashes at each hop. Plaintext content exists only inside the Gramine enclave boundary."

---

### 4. Two-Container Provider Design

A prose section explaining why the provider runs as two separate Docker Compose services rather than one:

- The enclave (`zkai-enclave`) must remain minimal — only inference and attestation logic runs inside the Gramine boundary. Adding wallet and blockchain SDK code to the enclave would expand the attack surface and complicate the Gramine manifest.
- The bridge (`zkai-bridge`) handles all on-chain interactions outside the TEE boundary, but receives only the opaque SHA-256 attestation hash from the enclave — never plaintext.
- The two containers communicate on an internal Docker network. The bridge cannot modify inference outputs; it can only forward the hash that the enclave produces.

---

### 5. Trust Model

A table:

| Component | Trusted | Threat if compromised | Mitigation |
|---|---|---|---|
| Gramine enclave boundary | Yes | Full plaintext exposure | Gramine isolates enclave pages; manifest hash anchored on-chain |
| Provider host OS | No | Can observe memory outside enclave | Gramine prevents host OS from reading enclave pages |
| Provider Docker runtime | No | Same as host OS | Same as above |
| Gateway (Vercel) | Partially | Request metadata visible; not prompt content | Gateway sees auth headers and model selection, not payload content |
| Relay (Fly.io) | Partially | Traffic routing; not content | Relay forwards opaque payloads; no decryption capability |
| zkai-bridge | No | Could submit wrong attestation hash | Hash is generated by the enclave; bridge cannot alter it without detection |
| Midnight contracts | Yes | Payment manipulation or fake registry | Open source; ZK proofs enforce billing correctness |
| ZK Proof Server | Yes (local) | Incorrect proofs | Runs inside provider infrastructure; proof verified by Midnight contract |
| Neon PostgreSQL | Partially | Operational data exposure | Does not store prompt content; stores only metadata |

A note below the table: in Gramine Direct Mode (development), TEE isolation is software-simulated and not hardware-enforced. SGX mode on compatible hardware (e.g. Azure DCsv3) provides hardware-enforced isolation and Intel IAS attestation.

---

### 6. Attestation Model

Prose section — no code. Explain:
- After inference, the enclave computes SHA-256 of the response
- The bridge submits this hash to `AttestationRegistry` via a ZK proof
- A consumer can verify: the hash of the response they received matches the hash anchored on Midnight for their job ID
- This proves the response was not tampered with between the enclave and the consumer
- In production SGX mode, the enclave keypair is backed by Intel IAS, providing hardware-rooted trust for the attestation

---

### 7. On-chain Payment Lifecycle

A numbered list:

1. The gateway selects a provider and the consumer's balance is checked before the job starts
2. The bridge calls `deductBalance` on `PaymentEscrow` — DUST is locked for this job
3. Inference runs; the bridge calls `submitAttestation` with the ZK proof and job ID
4. The `AttestationRegistry` contract verifies the ZK proof and releases payment from `PaymentEscrow` to the provider
5. If the provider is offline or sends an invalid proof, the gateway can trigger a dispute — the job times out and DUST is refunded

---

### 8. Development vs Production

| Aspect | Development | Production |
|---|---|---|
| TEE mode | Gramine Direct Mode (software) | Gramine SGX (hardware — e.g. Azure DCsv3) |
| Attestation signing | Self-signed by enclave | Signed by Intel IAS |
| SGX hardware required | No | Yes |
| Blockchain | Midnight preprod | Midnight mainnet (planned) |
| Relay | Local or hosted Fly.io | Fly.io |
| Gateway | Local Next.js dev server | Vercel (zkai.vercel.app) |
| Models | qwen2.5:1.5b, llama3.2:3b | Same (expandable via provider marketplace) |

---

### Related

- [README.md](README.md) — project overview and quick start
- [sdk/README.md](sdk/README.md) — Python SDK, CLI, and bridge API reference
- [frontend/README.md](frontend/README.md) — frontend and gateway local development
- [RUNBOOK.md](RUNBOOK.md) — operational runbook

---

## Final check before writing

- Zero fenced code blocks in output
- Architecture diagram embed is the first element after the H1
- Zero emojis
- File ends with a newline
