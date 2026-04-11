# ZKai Provider Node — Setup Guide

Run a ZKai provider node to serve private AI inference and earn **tNIGHT** tokens on the Midnight blockchain.

---

## How it works

```
Consumer → ZKai Gateway (Vercel) → Fly.io Relay → Your Node (outbound WS)
                                                      ↓
                                                  Ollama inference
                                                      ↓
                                              tNIGHT paid on-chain
```

Your node connects **outbound** to the relay — no public IP, no port forwarding, no Cloudflare needed.

---

## Prerequisites

- **Docker** + **Docker Compose v2**
- **Python 3.10+**
- **4 GB RAM minimum** (8 GB recommended)
- Internet access (outbound only)

---

## Step 1 — Clone & install the CLI

```bash
git clone https://github.com/Eshan276/zkai.git
cd zkai
pip install ./cli
zkai --help
```

---

## Step 2 — Initialize

```bash
zkai init
```

This single command:
- Fetches relay URL and secret from the ZKai gateway
- Generates a new Midnight wallet (seed)
- Writes `deploy/.seed`, `deploy/.bridge-seed`, and `provider/.env` with all required config

> If Node.js is not installed locally, `zkai init` runs keygen inside Docker automatically.

---

## Step 3 — Fund your wallet

Your bridge wallet needs **tNIGHT** (Midnight preprod testnet tokens) for gas.

1. Start the bridge briefly to get your wallet address:
   ```bash
   zkai start
   zkai logs bridge | grep Address
   ```
   Output: `Address: mn_addr_preprod1...`

2. Request tNIGHT from the faucet:  
   **[https://faucet.midnight.network](https://faucet.midnight.network)**

3. Wait ~2 min for tokens to arrive.

> You need ~5 tNIGHT for gas. DUST (Midnight's gas token) is auto-generated from tNIGHT — takes 5–10 min on first boot.

---

## Step 4 — Start the node

```bash
zkai start
```

On first boot this:
1. Downloads the `qwen2.5:1.5b` model (~1 GB, cached in a Docker volume)
2. Starts the Ollama inference server
3. Syncs the bridge wallet with Midnight preprod (2–5 min)
4. Connects outbound to the Fly.io relay via WebSocket

Check status:
```bash
zkai status
```

Watch logs:
```bash
zkai logs           # all services
zkai logs bridge    # wallet sync progress
zkai logs enclave   # inference + relay connection
```

Wait for:
```
[wallet:sync] isSynced=true
Wallet synced.
[relay] Connected to wss://zkai-relay.fly.dev
```

---

## Step 5 — Register on-chain

```bash
zkai register --model qwen2.5:1.5b --price 100
```

This:
- Fetches your enclave's TEE pubkey
- Auto-sets your endpoint to `https://zkai-relay.fly.dev/relay/<provider_id>`
- Registers in the ZKai gateway DB so consumers can discover you immediately
- Submits `registerProvider` to the Midnight ProviderRegistry contract (background)

Output:
```
Provider registered!
  TX:          submitted
  Provider ID: bce72e99...
  Endpoint:    https://zkai-relay.fly.dev/relay/bce72e99...
```

---

## Step 6 — Verify

```bash
zkai status
```

You'll see your **Provider Dashboard URL** at the bottom:
```
Provider Dashboard: https://zkai.vercel.app/provider_dashboard?id=bce72e99...
```

Check the relay has your node connected:
```bash
curl https://zkai-relay.fly.dev/health
# {"status":"ok","providers":1}
```

Test inference through the gateway (requires a consumer API key from [zkai.vercel.app](https://zkai.vercel.app)):
```bash
curl -X POST https://zkai.vercel.app/api/v1/chat/completions \
  -H "Authorization: Bearer zkai-YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5:1.5b","messages":[{"role":"user","content":"Hello!"}]}'
```

---

## Configuration reference

`provider/.env` (written by `zkai init`, edit to customise):

| Variable | Default | Description |
|---|---|---|
| `ZKAI_AUTH_URL` | `https://zkai.vercel.app` | Central gateway |
| `ZKAI_RELAY_URL` | `https://zkai-relay.fly.dev` | Fly.io WebSocket relay |
| `ZKAI_RELAY_SECRET` | — | Shared secret for relay auth (fetched automatically) |
| `ZKAI_PRICE_PER_REQUEST` | `100` | tNIGHT charged per inference |
| `OLLAMA_MODEL` | `qwen2.5:1.5b` | Model to run |
| `MAX_TOKENS` | `512` | Max tokens per response |

---

## Changing models

Edit `provider/.env`, then restart the enclave:
```bash
# Edit OLLAMA_MODEL=llama3.2:3b in provider/.env
zkai restart enclave
```

Ollama pulls the new model automatically on first inference.  
Browse models: [ollama.com/library](https://ollama.com/library)

---

## Stopping / deregistering

```bash
zkai stop          # stop containers (stays registered)
zkai deregister    # remove from registry and gateway
```

---

## Deployed contract addresses (Midnight preprod)

| Contract | Address |
|---|---|
| ProviderRegistry | `70f8c6b8661f687631165f333b1e5bd53919ce2ba03e029dc112c5e4f09c657e` |
| PaymentEscrow | `c7bcfc56772be622e5e31e8cd84b53f1a4fb259568de7f94ae3c9d6a10dd44d4` |
| AttestationRegistry | `9dfc5a38a7c8dca27fdfcec4360a66991b491947f48761fc8454a52717f6ff6a` |

---

## Troubleshooting

**Bridge wallet not syncing**
```bash
zkai logs bridge
# If stuck, wipe LevelDB and restart:
docker volume rm provider_bridge_leveldb
zkai stop && zkai start
```

**Relay not connecting**
```bash
zkai logs enclave | grep relay
# Should show: [relay] Connected to wss://zkai-relay.fly.dev
# Check ZKAI_RELAY_URL and ZKAI_RELAY_SECRET are set in provider/.env
```

**"Insufficient funds" / DUST errors**
```bash
zkai logs bridge | grep -i dust
# DUST auto-generates from tNIGHT — wait 10 min after funding
```

**Proof server not responding**
```bash
docker logs zkai-proof-server
# ARM64 (Apple Silicon): use platform: linux/amd64 in docker-compose.yml
```

**"Provider already registered"**  
Each `zkai register` generates a fresh provider_id — just run it again.
