# ZKai — Development Plan
> Decentralized Private AI Inference on Midnight Chain
> Hardware: i5-10300H | Dev mode: TEE Simulation via Docker + Gramine

---

## Overview

| Phase | Focus | Target |
|-------|-------|--------|
| 1 | Local TEE sim + LLM inference | Working enclave with Qwen |
| 2 | Encryption + API layer | E2E encrypted prompt/response |
| 2.5 | Python SDK — OpenAI-compatible client | `pip install zkai`, drop-in replacement |
| 3 | Midnight contracts | Payment + registry on-chain |
| 4 | Attestation + ZK billing | Trust layer |
| 5 | Testnet integration | Full flow on Midnight testnet |

---

## Phase 1 — TEE Simulation + LLM Inference
> Goal: Run Qwen inside a simulated TEE enclave locally

### Step 1.1 — Environment Setup
- [ ] Install Docker + Docker Compose
- [ ] Pull Gramine Docker image (`gramineproject/gramine:latest`)
- [ ] Verify SGX sim mode works inside container
- [ ] Install `llama.cpp` inside Gramine container (handles GGUF models)

### Step 1.2 — Get the Model
- [ ] Download Qwen2.5-1.5B-Instruct GGUF (Q4_K_M quantized) — ~1GB
- [ ] Mount model into Gramine container volume
- [ ] Run basic inference test (prompt → response, no enclave yet)
- [ ] Measure: tokens/sec, RAM usage, latency

### Step 1.3 — Wrap in Gramine Enclave (Sim Mode)
- [ ] Write `llama.manifest.template` — Gramine manifest file for llama.cpp
- [ ] Configure allowed files, network, memory limits in manifest
- [ ] Run `gramine-sgx-sign` in sim mode (no real SGX hardware needed)
- [ ] Run inference inside enclave: `gramine-direct llama ...`
- [ ] Confirm: process is isolated, manifest is enforced

### Step 1.4 — Dockerize the Enclave
- [ ] Write `Dockerfile` based on Gramine image
  - Copy model, manifest, llama.cpp binary
  - Expose HTTP port for inference API
- [ ] Write `docker-compose.yml`
  - `enclave` service (Gramine + Qwen)
  - `api` service (thin HTTP wrapper)
- [ ] Test: `docker compose up` → curl prompt → get response

**Deliverable:** Docker Compose setup where Qwen runs inside sim TEE, accessible via HTTP

---

## Phase 2 — Encryption + API Layer
> Goal: User prompt never travels in plaintext; only TEE can decrypt

### Step 2.1 — Key Generation inside Enclave
- [ ] On enclave startup, generate X25519 keypair inside TEE
- [ ] Expose public key via `/pubkey` endpoint
- [ ] Private key never leaves enclave (stays in enclave memory only)

### Step 2.2 — Client-side Encryption
- [ ] Build simple CLI client (Python or Go)
- [ ] Client fetches provider pubkey from `/pubkey`
- [ ] Client encrypts prompt using provider pubkey (X25519 + ChaCha20-Poly1305)
- [ ] Send encrypted payload to enclave API

### Step 2.3 — Enclave Decrypts + Infers + Re-encrypts
- [ ] Enclave API receives encrypted prompt
- [ ] Decrypts using private key (inside TEE, never exposed)
- [ ] Runs Qwen inference on plaintext prompt
- [ ] Encrypts response with user's session pubkey
- [ ] Returns encrypted response

### Step 2.4 — Client Decrypts Response
- [ ] Client receives encrypted response
- [ ] Decrypts locally with session private key
- [ ] Display plaintext response

**Deliverable:** Full E2E encrypted inference — operator running the Docker container cannot read prompts or responses

---

## Phase 2.5 — Python SDK (OpenAI-Compatible)
> Goal: Zero-friction migration from OpenAI / LangChain — user changes 2 lines of code, everything else stays the same

### Design Principle
```python
# Before (OpenAI)
from openai import OpenAI
client = OpenAI(api_key="sk-...")

# After (ZKai) — identical interface
from zkai import ZKai
client = ZKai(wallet_key="...")

# This works unchanged:
response = client.chat.completions.create(
    model="qwen2.5-1.5b",
    messages=[{"role": "user", "content": "hello"}]
)
print(response.choices[0].message.content)
```

### What SDK Handles Invisibly
All of this happens inside `client.chat.completions.create(...)`:
1. Fetch best available provider from Midnight registry
2. Get provider TEE public key
3. Lock DUST in escrow (`createJob`)
4. Encrypt prompt with TEE pubkey (X25519 + ChaCha20)
5. Send to provider endpoint
6. Receive encrypted response
7. Silently verify attestation hash matches on-chain
8. Decrypt response
9. Return OpenAI-compatible response object

### Step 2.5.1 — Core SDK (`zkai` Python package)
- [ ] Create `zkai/` Python package structure
- [ ] `ZKai` client class with `chat.completions.create()` method
- [ ] Returns `ChatCompletion` object matching OpenAI schema exactly
- [ ] Provider selection logic (fetch registry, filter by reputation + price)
- [ ] Encryption/decryption wired in transparently
- [ ] Streaming support (`stream=True`) — yield chunks as they decrypt

### Step 2.5.2 — Wallet + Payment Integration
- [ ] `ZKai(wallet_key="...")` — loads Midnight wallet
- [ ] Auto-creates escrow job before each request
- [ ] Auto-releases / disputes after response received
- [ ] `max_price_per_token` param — skip providers above threshold
- [ ] Balance check before request, friendly error if insufficient DUST

### Step 2.5.3 — Attestation Handling (Silent)
- [ ] SDK auto-fetches attestation from provider after each response
- [ ] Verifies against on-chain hash — user never needs to think about this
- [ ] On failure: raise `ZKaiAttestationError` with clear message + auto-refund
  ```
  ZKaiAttestationError: Provider tampered with model.
    Expected: qwen2.5-1.5b (hash: 0xabc...)
    Got:      0xdef...
    Job refunded automatically.
  ```

### Step 2.5.4 — LangChain Adapter
```python
# One line change from ChatOpenAI
from zkai.langchain import ChatZKai
llm = ChatZKai(model="qwen2.5-1.5b", wallet_key="...")
# All LangChain chains, agents, RAG pipelines work unchanged
```
- [ ] `ChatZKai` class extending LangChain `BaseChatModel`
- [ ] Compatible with LCEL chains, agents, RAG pipelines
- [ ] Test with a simple LangChain RAG example end-to-end

### Step 2.5.5 — Provider Setup CLI
```bash
# Provider side — one command to go live
zkai-provider start \
  --model qwen2.5-1.5b \
  --wallet 0x... \
  --stake 100 \
  --price 0.0001   # DUST per token
```
- [ ] `zkai-provider` CLI tool
- [ ] Auto-pulls model if not present
- [ ] Starts Docker + Gramine enclave
- [ ] Registers on Midnight contract
- [ ] Exposes public endpoint via cloudflared tunnel (no port forwarding needed)

### Step 2.5.6 — Package + Docs
- [ ] `pip install zkai` works
- [ ] README with migration guide from OpenAI (< 5 min)
- [ ] README with migration guide from LangChain (< 5 min)
- [ ] Environment variable support: `ZKAI_WALLET_KEY`, `ZKAI_MAX_PRICE`

**Deliverable:** `pip install zkai` → drop-in OpenAI replacement with full privacy. LangChain users migrate in one line.

---

## Phase 3 — Midnight Smart Contracts
> Goal: On-chain provider registry, shielded payments, stake/reputation

### Step 3.1 — Setup Midnight Dev Environment
- [ ] Install Midnight node (testnet) or use hosted RPC
- [ ] Install Compact language toolchain (Midnight's smart contract language)
- [ ] Install `midnight-js` SDK
- [ ] Get testnet DUST tokens from faucet
- [ ] Deploy a hello-world contract to confirm setup works

### Step 3.2 — Provider Registry Contract
Write `ProviderRegistry.compact`:
- [ ] `registerProvider(pubkey, endpoint, stakeAmount)` — provider joins network
- [ ] `deregisterProvider()` — provider exits, stake returned
- [ ] `getProviders()` — list active providers
- [ ] `getProvider(id)` — fetch provider pubkey + endpoint
- [ ] Stake minimum enforced (slashing later)
- [ ] Deploy to Midnight testnet

### Step 3.3 — Shielded Payment Contract
Write `PaymentEscrow.compact`:
- [ ] `createJob(providerID, tokenAmount)` — user locks DUST in escrow (shielded)
- [ ] `completeJob(jobID, attestationHash)` — provider claims payment after job done
- [ ] `disputeJob(jobID)` — user can dispute within timeout window
- [ ] All balances shielded — Midnight handles ZK automatically via DUST
- [ ] Deploy to Midnight testnet

### Step 3.4 — Wire Client to Contracts
- [ ] Client calls `createJob` before sending encrypted prompt
- [ ] Enclave calls `completeJob` after inference with attestation hash
- [ ] Client verifies attestation before decrypting response

**Deliverable:** Payments flow on Midnight testnet, shielded, without identity linkage

---

## Phase 4 — Attestation + ZK Billing
> Goal: Cryptographic proof that correct model ran and data wasn't leaked

### Step 4.1 — Simulated Attestation Report
- [ ] On enclave startup, generate attestation object:
  ```json
  {
    "model_hash": "sha256 of model weights",
    "gramine_version": "...",
    "manifest_hash": "sha256 of manifest",
    "timestamp": "...",
    "pubkey": "enclave pubkey"
  }
  ```
- [ ] Sign attestation with enclave keypair
- [ ] Expose via `/attestation` endpoint
- [ ] In sim mode: attestation is self-signed (good enough for dev)
- [ ] In production (Azure SGX): attestation is signed by Intel IAS

### Step 4.2 — Anchor Attestation On-chain
- [ ] Hash the attestation report
- [ ] Provider posts hash to `AttestationRegistry` contract on Midnight
- [ ] Users can verify: hash of what they received matches on-chain hash
- [ ] Add `attestationHash` field to `completeJob` call

### Step 4.3 — ZK Token Count Proof (Billing)
- [ ] Track token count inside enclave (input + output tokens)
- [ ] Generate ZK proof: "I processed N tokens" without revealing content
- [ ] Use a simple ZK circuit (can use `snarkjs` + circom for this)
  - Public input: token count
  - Private input: actual prompt/response
  - Proof: token count is correct without revealing content
- [ ] Include proof in `completeJob` call
- [ ] Contract verifies proof before releasing payment

### Step 4.4 — Reputation System
Write `ReputationContract.compact`:
- [ ] Provider accumulates reputation from completed jobs
- [ ] Reputation is ZK aggregated — score is public, job details are private
- [ ] Router weights providers by reputation + stake
- [ ] Slashing: if provider disputes lost, stake slashed, reputation penalized

**Deliverable:** Full trust layer — attestation proves correctness, ZK proves billing, reputation guides routing

---

## Phase 5 — Testnet Integration + Full Flow
> Goal: End-to-end working demo on Midnight testnet

### Step 5.1 — Multi-provider Setup
- [ ] Spin up 2-3 Docker provider instances (simulate different providers)
- [ ] Each registers on Midnight testnet with different stakes
- [ ] Build simple router: user queries registry, picks best provider

### Step 5.2 — Full Flow Test
End-to-end test:
- [ ] User fetches provider list from registry contract
- [ ] User picks provider, fetches pubkey
- [ ] User creates shielded escrow job on Midnight
- [ ] User sends encrypted prompt to provider endpoint
- [ ] Provider TEE decrypts, infers, re-encrypts, posts attestation
- [ ] Provider calls `completeJob` with attestation hash + ZK billing proof
- [ ] Payment released from escrow to provider
- [ ] User decrypts and verifies response

### Step 5.3 — Basic Frontend
- [ ] Simple web UI (Next.js or plain HTML)
  - Connect Midnight wallet
  - Browse providers (reputation, price per token, model)
  - Submit prompt (encrypted automatically)
  - View response
- [ ] Wallet integration via `midnight-js`

### Step 5.4 — Stress Test + Edge Cases
- [ ] Provider goes offline mid-job → escrow timeout refund
- [ ] Provider sends wrong attestation → dispute flow
- [ ] Multiple concurrent users → routing works correctly
- [ ] Model swap attack → manifest hash mismatch detected

**Deliverable:** Live demo on Midnight testnet, shareable link, full privacy guarantees

---

## Tech Stack Summary

| Layer | Tech |
|-------|------|
| TEE runtime | Gramine (sim → SGX) |
| LLM | Qwen2.5-1.5B GGUF via llama.cpp |
| Encryption | X25519 + ChaCha20-Poly1305 |
| Containerization | Docker + Docker Compose |
| Smart contracts | Compact (Midnight) |
| Chain SDK | midnight-js |
| ZK circuits | circom + snarkjs |
| Client SDK | Python (`zkai` package, OpenAI-compatible) |
| LangChain adapter | `zkai.langchain.ChatZKai` |
| Provider CLI | `zkai-provider` (Docker + cloudflared tunnel) |
| Frontend | Next.js |
| Prod TEE (later) | Azure DCsv3 (Intel SGX) |

---

## Key Milestones

```
Week 1-2   Phase 1 complete — Qwen runs in sim TEE
Week 3     Phase 2 complete — E2E encryption works
Week 3-4   Phase 2.5 complete — pip install zkai, OpenAI-compatible SDK
Week 5-6   Phase 3 complete — Midnight contracts deployed to testnet
Week 7-8   Phase 4 complete — Attestation + ZK billing live
Week 9-11  Phase 5 complete — Full demo on testnet
```

---

## What to Skip for Now (revisit later)

- Real SGX hardware (use sim mode until Phase 5 demo)
- zkML proof of correct inference (too expensive, not practical yet)
- Token economics / tokenomics design
- Mobile client
- Multi-model marketplace (start with one model)
