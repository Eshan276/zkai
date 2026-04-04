# ZKai Provider Node — Setup Guide

Run a ZKai provider node to serve private AI inference and earn DUST tokens on the Midnight blockchain.

---

## Overview


A ZKai provider node consists of three Docker services:

| Service | Role |
|---|---|
| `enclave` | Ollama-based inference engine + FastAPI (port 8080) |
| `bridge` | Midnight wallet + on-chain contract interactions (port 7300) |
| `proof-server` | ZK proof generation for Midnight transactions (port 6300) |

Consumers send encrypted prompts → your enclave runs inference → DUST is deducted from their on-chain escrow and paid to you.

---

## Prerequisites

- **Docker** + **Docker Compose** (v2)
- **Python 3.10+** with the `zkai` CLI installed
- **4 GB+ RAM** (8 GB recommended for larger models)
- A public endpoint — either a static IP/domain, or use the built-in Cloudflare Tunnel

---

## Step 1 — Install the CLI

Clone the repo and install the CLI from source:

```bash
git clone https://github.com/Eshan276/zkai.git
cd zkai
pip install ./cli
```

Verify:

```bash
zkai --help
```

---

## Step 2 — Initialize the provider

Run the interactive setup wizard from inside the `zkai` repo root:

```bash
zkai init
```

This will:
1. Detect or clone the repo
2. Generate a Midnight wallet (or import an existing seed)
3. Create `deploy/.seed` with your wallet seed
4. Write `provider/.env` with your config

> **Keep `deploy/.seed` safe.** It controls your wallet. Never commit it to git.

### Generate a wallet manually (optional)

```bash
zkai keygen
```

Copy the printed seed into `deploy/.seed`:

```bash
echo "YOUR_64_CHAR_HEX_SEED" > deploy/.seed
chmod 600 deploy/.seed
```

---

## Step 3 — Fund your wallet

Your bridge wallet needs **tNight tokens** (Midnight preprod testnet) to pay for gas on contract transactions.

1. Get your wallet address:

```bash
zkai info
```

Or look in `deploy/.seed` and derive the address via the [Midnight Lace wallet](https://midnight.network).

2. Request tNight from the **Midnight faucet**:  
   [https://faucet.midnight.network](https://faucet.midnight.network)

3. Wait for the faucet to send tokens (~1-2 min).

> You need at least **~5 tNight** for gas. DUST is auto-generated from tNight once the wallet is registered.

---

## Step 4 — Start the provider stack

```bash
zkai start
```

This runs `docker compose up -d` for all three services. On first startup the enclave container automatically:

1. Starts the Ollama server inside the container
2. Pulls the model (`qwen2.5:1.5b` by default, ~1 GB) — **this only happens once**, model is cached in a Docker volume
3. Starts the FastAPI inference server on port 8080

The bridge wallet also needs to sync with Midnight preprod, which can take **2–5 minutes**.

Check status:

```bash
zkai status
```

Watch logs:

```bash
zkai logs           # all services
zkai logs bridge    # just the bridge
zkai logs enclave   # just the enclave
```

Wait until you see:

```
[wallet:sync] isSynced=true
Wallet synced.
```

---

## Step 5 — Set up a public endpoint

Consumers need to reach your enclave. Two options:

### Option A — Cloudflare Tunnel (no static IP needed)

```bash
zkai start --tunnel
```

Get your tunnel URL:

```bash
zkai tunnel-url
```

Output: `https://xxxxx.trycloudflare.com`

> Quick tunnels are **temporary** — the URL changes on each restart. For a permanent URL, create a [named Cloudflare tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) and set `CLOUDFLARE_TUNNEL_TOKEN` in `provider/.env`.

### Option B — Direct IP or domain

Open port **8080** on your firewall and use:

```
http://YOUR_IP:8080
```

Or put it behind nginx/Caddy with HTTPS.

---

## Step 6 — Register on-chain

```bash
ZKAI_AUTH_URL=https://zkai.vercel.app zkai register --endpoint https://xxxxx.trycloudflare.com
```

Options:

| Flag | Default | Description |
|---|---|---|
| `--endpoint` | prompted | Public URL consumers will connect to |
| `--model` | `qwen2.5:1.5b` | Model name (informational) |
| `--price` | `100` | DUST charged per inference request |

This:
- Fetches your enclave's TEE pubkey
- Derives a unique `provider_id`
- Submits a `registerProvider` transaction to the Midnight `ProviderRegistry` contract
- Registers in the ZKai central gateway DB so consumers can discover you

On success:

```
Provider registered!
  TX:          submitted
  Provider ID: 6dacaaca...
  Endpoint:    https://xxxxx.trycloudflare.com
```

Your provider_id and config are saved to `provider/.provider_id`.

---

## Step 7 — Test it

Health check:

```bash
curl https://xxxxx.trycloudflare.com/health
# {"status":"ok","enclave_mode":"direct"}
```

Test inference directly:

```bash
curl -X POST https://xxxxx.trycloudflare.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}]}'
```

Test through the gateway (requires a consumer API key):

```bash
curl -X POST https://zkai.vercel.app/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: zkai-YOUR_KEY" \
  -d '{"model":"qwen2.5:1.5b","messages":[{"role":"user","content":"Hello!"}]}'
```

---

## Configuration reference

All config lives in `provider/.env`. Create it if it doesn't exist:

```env
# Midnight on-chain auth gateway
ZKAI_AUTH_URL=https://zkai.vercel.app

# DUST charged per inference request (default: 100)
ZKAI_PRICE_PER_REQUEST=100

# Ollama model to run (must be pulled in the container)
OLLAMA_MODEL=qwen2.5:1.5b

# Max tokens per response
MAX_TOKENS=512

# For named Cloudflare tunnel (optional — leave blank for quick tunnel)
# CLOUDFLARE_TUNNEL_TOKEN=your_token_here
```

---

## Changing models

Edit `provider/.env`:

```env
OLLAMA_MODEL=llama3.2:3b
```

Then restart:

```bash
zkai restart enclave
```

Ollama will pull the new model automatically on first inference (takes a few minutes).

Available models: [ollama.com/library](https://ollama.com/library)

---

## Updating your endpoint

If your tunnel URL changes (e.g. after a restart), re-register:

```bash
zkai tunnel-url  # get new URL
ZKAI_AUTH_URL=https://zkai.vercel.app zkai register --endpoint https://new-url.trycloudflare.com
```

Each `zkai register` call generates a fresh `provider_id` — no need to deregister first.

---

## Stopping the node

```bash
zkai stop
```

Your provider will remain registered on-chain. Consumers may fail to reach you until you start again. Run `zkai deregister` if you want to remove yourself from the registry.

---

## Deregistering

```bash
ZKAI_AUTH_URL=https://zkai.vercel.app zkai deregister
```

This marks you inactive in the `ProviderRegistry` contract. Consumers will stop routing requests to you.

---

## Deployed contract addresses (Midnight preprod)

| Contract | Address |
|---|---|
| ProviderRegistry | `38cd120df3dcdd54ab560f705c746c66f80ce457298323262427a1074e13d655` |
| PaymentEscrow | `b0bc636ce16d63f92a06696ecd2ceda78367ad3f712f8b769f01bf0e20555926` |
| AttestationRegistry | `e9dd5bad3fbc08ab866e55beb9b48bbc832d232c60edd322cdbebed1ee2a0b32` |

---

## Troubleshooting

### Bridge wallet not syncing

```bash
zkai logs bridge
```

If it's stuck, wipe the LevelDB state and restart:

```bash
docker compose down
docker volume rm provider_bridge_leveldb
docker compose up -d
```

> LevelDB can get corrupted on rapid restarts. This is safe — wallet state is re-synced from the chain.

### "Provider already registered" on `zkai register`

This is a known contract limitation — deregistered IDs can't be reused. Just run `zkai register` again with the same or a new endpoint — each call generates a fresh `provider_id`.

### Enclave can't reach bridge

```bash
zkai logs enclave
```

Look for `deduct-balance failed`. Make sure the bridge is healthy:

```bash
curl http://localhost:7300/health
```

### "Insufficient funds" / "could not balance dust"

Your bridge wallet is out of DUST. DUST is auto-generated from tNight UTXOs — it can take up to 10 minutes after funding. Check:

```bash
zkai logs bridge | grep -i dust
```

### Proof server not responding

```bash
docker logs zkai-proof-server
```

On ARM64 (Apple Silicon, Raspberry Pi), make sure you're using a compatible image tag. The `latest` tag may not support ARM64.

---

## Architecture

```
Consumer
  │
  ├─ HTTPS ──► ZKai Gateway (Vercel)
  │               │ picks provider from registry
  │               │ forwards X-Coin-Public-Key header
  │               └─ HTTPS ──► Enclave (your machine :8080)
  │                               │ runs Ollama inference
  │                               └─ async ──► Bridge (:7300)
  │                                               ├─ deductBalance (PaymentEscrow)
  │                                               └─ postAttestation (AttestationRegistry)
  │
  └─ Midnight chain (preprod)
      ├─ ProviderRegistry  — who's available
      ├─ PaymentEscrow     — consumer DUST balances
      └─ AttestationRegistry — proof of inference
```
