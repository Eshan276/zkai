# ZKai Runbook

**Network:** Midnight Preprod
**Contracts (live):**
- ProviderRegistry: `38cd120df3dcdd54ab560f705c746c66f80ce457298323262427a1074e13d655`
- PaymentEscrow: `bfae0b0329c15978c892047bb4cee425030184153abdddd4a53a0f155c4a91da`
- AttestationRegistry: `e9dd5bad3fbc08ab866e55beb9b48bbc832d232c60edd322cdbebed1ee2a0b32`

---

## Architecture (v1)

```
Consumer (Python)                  Provider Server                 Midnight Chain
─────────────────                  ───────────────                 ─────────────
pip install zkai                   Docker Compose:
                                     ┌─ enclave (port 8080)
ZKai(api_key="...")                  │    Ollama + FastAPI
  │                                  └─ bridge  (port 7300)
  │                                       Midnight wallet
  │
  ├─ GET /pubkey ─────────────────► enclave
  ├─ POST /infer (encrypted) ─────► enclave
  │                                  decrypts → Ollama → encrypts
  │                                  bridge.postAttestation() ───► AttestationRegistry
  │
  ├─ verify attestation ──────────────────────────────────────────► indexer GraphQL (free)
  └─ decrypt response
```

**Key design decisions:**
- Consumers: no wallet, no Node.js, no bridge. Just `pip install zkai` + API key.
- Providers: run everything server-side (Docker Compose brings up enclave + bridge together).
- Blockchain: providers write (register, post attestations), consumers only read (free, via GraphQL).

---

## For Providers

### Requirements
- Linux server with Docker + Docker Compose
- Node.js 20+ (used inside bridge container — no install needed if using Docker)
- 4 GB RAM minimum
- A Midnight preprod wallet with tNight tokens
- A public IP or domain (so consumers can reach your endpoint)

---

### Step 1 — Clone and configure

```bash
git clone https://github.com/your-org/zkai
cd zkai
```

---

### Step 2 — Get a Midnight wallet and fund it

```bash
cd wallet
npm install
node keygen.mjs
```

Save the **seed** (64 hex chars). Fund the **unshielded address** (`mn_addr_preprod1...`):
- Faucet: https://faucet.preprod.midnight.network/
- Request 1000 tNight. Wait ~2 minutes.

Write the seed to the deploy directory:
```bash
echo "YOUR_64_HEX_SEED" > deploy/.seed
```

---

### Step 3 — Generate API keys for your consumers

Create a file with one key per line:
```bash
# Generate 3 random API keys
python3 -c "import secrets; [print(secrets.token_hex(32)) for _ in range(3)]" > provider/api_keys.txt
cat provider/api_keys.txt
```

Set them as an env var (or use the file):
```bash
# Option A: comma-separated in .env
echo 'ZKAI_API_KEYS=key1,key2,key3' > provider/.env

# Option B: file (add to docker-compose.yml: ZKAI_API_KEYS_FILE=/keys.txt)
```

Share individual keys with each consumer. Rotate anytime by updating the list.

Leave `ZKAI_API_KEYS` empty for open access (dev mode — no auth required).

---

### Step 4 — Start everything

```bash
cd provider
docker compose up -d
```

This starts two containers:
- **zkai-bridge** — syncs your Midnight wallet, exposes port 7300 (internal only)
- **zkai-enclave** — Ollama + FastAPI on port 8080 (public)

Watch startup logs:
```bash
docker compose logs -f
```

The bridge takes 2-5 minutes to sync with Midnight on first boot. Wait until you see:
```
zkai-bridge  | Wallet synced.
zkai-bridge  | Bridge running at http://127.0.0.1:7300
zkai-enclave | Application startup complete.
```

---

### Step 5 — Register your provider on-chain (one time)

```bash
docker compose exec bridge npx tsx src/register-provider.ts \
  --endpoint http://YOUR_PUBLIC_IP_OR_DOMAIN:8080 \
  --model qwen2.5-1.5b \
  --price 100
```

Expected:
```
TEE pubkey: <hex>
Provider ID: <64 hex chars>
✅ Provider registered!
   TX: <tx hash>
```

Save your Provider ID. You're now discoverable by consumers who query the on-chain registry.

---

### Step 6 — Verify everything works

```bash
# Health checks
curl http://localhost:8080/health
# {"status":"ok","enclave_mode":"direct"}

curl http://localhost:7300/health
# {"status":"ok","synced":true,"address":"mn_addr_preprod1..."}

# Test inference (no auth if ZKAI_API_KEYS is empty)
curl -X POST http://localhost:8080/infer \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{"client_pubkey":"test","encrypted_prompt":"test"}'
```

---

### Provider is live

Your setup:
- Enclave running on port 8080 (expose this publicly)
- Bridge running internally (never expose port 7300 externally)
- Every inference automatically posts an attestation to Midnight
- Consumers can verify your attestations for free via the indexer

Keep both containers running. They restart automatically on failure.

---

## For Consumers

No wallet. No Node.js. No blockchain setup.

### Step 1 — Install

```bash
pip install zkai
```

---

### Step 2 — Get an API key from a provider

Contact a provider and get an API key. They'll give you:
- Their endpoint URL (e.g. `https://provider.example.com:8080`)
- An API key

---

### Step 3 — Use it

#### Basic (provider auto-selected from on-chain registry)

```python
from zkai import ZKai

client = ZKai(
    api_key="your-api-key",
    registry_contract="38cd120df3dcdd54ab560f705c746c66f80ce457298323262427a1074e13d655",
    attestation_contract="e9dd5bad3fbc08ab866e55beb9b48bbc832d232c60edd322cdbebed1ee2a0b32",
)

response = client.chat.completions.create(
    model="qwen2.5-1.5b",
    messages=[{"role": "user", "content": "Explain zero-knowledge proofs simply"}]
)

print(response.choices[0].message.content)
```

#### Point directly at a specific provider

```python
from zkai import ZKai
from zkai.provider import Provider

# Bypass registry — use a specific provider directly
client = ZKai(api_key="your-api-key")

# Override provider selection (advanced)
import zkai.provider as p
p._OVERRIDE_ENDPOINT = "https://provider.example.com:8080"
```

Or simpler — just set `registry_contract=None` and make sure the provider runs locally:
```python
client = ZKai(api_key="your-key")  # defaults to localhost:8080
```

#### LangChain drop-in

```python
from zkai import ChatZKai

llm = ChatZKai(
    api_key="your-api-key",
    registry_contract="38cd120df3dcdd54ab560f705c746c66f80ce457298323262427a1074e13d655",
    attestation_contract="e9dd5bad3fbc08ab866e55beb9b48bbc832d232c60edd322cdbebed1ee2a0b32",
)

# Use exactly like ChatOpenAI
response = llm.invoke("What is a TEE?")
print(response.content)
```

---

## What the SDK does under the hood

Every `chat.completions.create()` call:

```
1. Query ProviderRegistry (GraphQL) → find best provider by reputation + price
2. GET /pubkey → fetch provider's TEE public key
3. Generate ephemeral X25519 keypair
4. Encrypt prompt with X25519 ECDH + ChaCha20-Poly1305
5. POST /infer {encrypted_prompt, client_pubkey} + X-API-Key header
   → Provider decrypts inside TEE, runs Ollama, encrypts response
   → Provider posts attestation hash to Midnight (you don't wait for this)
6. Verify attestation:
   - Fetch /attestation from provider
   - SHA256 hash it
   - Compare to attestation_hash in /infer response ✓
   - (optional) Compare to on-chain hash from AttestationRegistry ✓
   - Mismatch → raise ZKaiAttestationError
7. Decrypt response with the same ephemeral keypair
8. Return ChatCompletion object
```

The provider operator **cannot read your prompts** — they're encrypted before transmission and decrypted only inside the TEE.

---

## Troubleshooting

**`ZKaiAuthError: Invalid or missing API key`**
→ Get an API key from your provider. Pass it as `api_key=` to ZKai.

**`ZKaiAttestationError`**
→ The provider's attestation doesn't match. Either:
- Provider restarted (new keypair) — wait a few minutes and retry
- Genuinely tampered — switch providers
- For dev/testing: `ZKai(skip_attestation=True)`

**`No providers available for model`**
→ Pass `registry_contract=None` to skip on-chain lookup and use `localhost:8080`

**Bridge won't sync (provider side)**
→ Check your seed file: `cat deploy/.seed` — must be 64 hex chars
→ Check tNight balance was received (wait 2-3 min after faucet)
→ `docker compose logs bridge` for details

**Model download slow (provider side)**
→ First run downloads Qwen2.5-1.5B (~1GB). Just wait.
→ `docker compose logs enclave` to watch progress
