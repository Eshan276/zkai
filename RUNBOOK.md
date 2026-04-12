# ZKai Runbook

Operational guide for running, validating, and troubleshooting ZKai services on Midnight preprod.

## Quick Navigation

1. [Live Configuration](#live-configuration)
2. [Architecture Snapshot](#architecture-snapshot)
3. [Provider Operations](#provider-operations)
4. [Consumer Smoke Test](#consumer-smoke-test)
5. [Health and Monitoring](#health-and-monitoring)
6. [Troubleshooting Matrix](#troubleshooting-matrix)
7. [Security and Ops Hygiene](#security-and-ops-hygiene)

---

## Live Configuration

| Item | Value |
|---|---|
| Network | Midnight preprod |
| Gateway | `https://zkai.vercel.app` |
| Relay | `https://zkai-relay.fly.dev` |
| Provider Registry | `70f8c6b8661f687631165f333b1e5bd53919ce2ba03e029dc112c5e4f09c657e` |
| Payment Escrow | `c7bcfc56772be622e5e31e8cd84b53f1a4fb259568de7f94ae3c9d6a10dd44d4` |
| Attestation Registry | `9dfc5a38a7c8dca27fdfcec4360a66991b491947f48761fc8454a52717f6ff6a` |

> Keep contract values in sync with `provider/docker-compose.yml` and frontend env vars before production-like testing.

---

## Architecture Snapshot

ZKai request path:

`Consumer -> Gateway (Vercel) -> Relay (Fly.io) -> Provider Enclave (Ollama + FastAPI) -> Bridge (Midnight wallet/contracts) -> Midnight preprod`

Service split on provider node:

- `zkai-enclave` (port `8080`): inference, enclave keypair, attestation hash generation.
- `zkai-bridge` (port `7300`, internal): wallet sync, contract calls, provider registry updates.
- `zkai-proof-server` (port `6300`, internal): proof generation used by bridge flows.

Trust boundary summary:

- Plaintext inference execution is enclave-side.
- Payment and attestation anchoring are bridge-side.
- Relay forwards correlated payloads and responses over persistent provider WebSocket sessions.

---

## Provider Operations

### 1. Prerequisites

- Linux server or VM with outbound internet access.
- Docker Engine + Docker Compose v2.
- Python `3.9+` (for CLI bootstrap path).
- Midnight preprod wallet seed funded with tNIGHT.
- At least 4 GB RAM (8 GB recommended).

### 2. Bootstrap (Recommended: CLI Path)

```bash
git clone https://github.com/Eshan276/zkai.git
cd zkai
pip install ./cli

zkai init
zkai start
zkai register --model qwen2.5:1.5b --price 100
```

What this does:

1. Pulls relay config and writes provider env files.
2. Generates or reuses wallet seed files (`deploy/.seed`, `deploy/.bridge-seed`).
3. Starts `enclave`, `bridge`, and `proof-server` via Docker Compose.
4. Registers provider endpoint for gateway discovery and submits on-chain registration.

### 3. Bootstrap (Manual Compose Path)

```bash
git clone https://github.com/Eshan276/zkai.git
cd zkai/provider
docker compose up -d
```

Manual registration:

```bash
docker compose exec bridge npx tsx src/register-provider.ts \
  --endpoint https://zkai-relay.fly.dev/relay/<provider_id> \
  --model qwen2.5:1.5b \
  --price 100
```

### 4. First-Run Validation

```bash
zkai status
zkai logs bridge --lines 80
zkai logs enclave --lines 80
```

Expected signals:

- Bridge reports `synced: true` from `/health`.
- Enclave `/health` returns `{"status":"ok", ...}`.
- Enclave logs show relay connection established.
- Provider appears in `https://zkai.vercel.app/provider_dashboard?id=<provider_id>`.

### 5. Day-2 Commands

```bash
zkai status
zkai logs --follow
zkai restart enclave
zkai restart bridge
zkai stop
zkai deregister
```

---

## Consumer Smoke Test

### 1. HTTP Gateway Test

```bash
curl -X POST https://zkai.vercel.app/api/v1/chat/completions \
  -H "Authorization: Bearer zkai-YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5:1.5b","messages":[{"role":"user","content":"Hello"}]}'
```

Expected outcome:

- HTTP `200` with OpenAI-compatible `choices[0].message.content`.
- Response includes `x_zkai` metadata (job ID, attestation hash) when upstream path provides it.

### 2. Python SDK Test

```bash
pip install zkai
```

```python
from zkai import ZKai

client = ZKai(
    api_key="zkai-YOUR_KEY",
    base_url="https://zkai.vercel.app",
)

resp = client.chat.completions.create(
    model="qwen2.5:1.5b",
    messages=[{"role": "user", "content": "Explain attestation in one line."}],
)

print(resp.choices[0].message.content)
```

### 3. Direct Provider Test (Advanced)

```python
from zkai import ZKai

client = ZKai(
    api_key="zkai-YOUR_KEY",
    provider_endpoint="http://localhost:8080",
)

resp = client.chat.completions.create(
    model="qwen2.5-1.5b",
    messages=[{"role": "user", "content": "Direct path test"}],
)

print(resp.choices[0].message.content)
```

---

## Health and Monitoring

### Core Health Checks

| Component | Command | Healthy Signal |
|---|---|---|
| Enclave | `curl http://localhost:8080/health` | `status=ok` |
| Bridge | `curl http://localhost:7300/health` | `synced=true` |
| Relay | `curl https://zkai-relay.fly.dev/health` | `status=ok` and provider count |
| Gateway | `curl https://zkai.vercel.app/api/relay-config` | returns relay config when configured |

### Useful Logs

```bash
zkai logs enclave --lines 100
zkai logs bridge --lines 100
docker logs zkai-proof-server --tail 100
```

### Wallet/Sync Observability

Bridge sync can take 2-5 minutes on cold start. During this window:

- `zkai-bridge` is up but may report `synced=false`.
- Contract calls can fail until sync and dust readiness complete.
- Keep node running; avoid repeated restarts during initial sync.

---

## Troubleshooting Matrix

| Symptom | Likely Cause | What to Check | Action |
|---|---|---|---|
| `No providers available for model` | Provider not active or not registered | Provider dashboard, `/api/providers`, relay health | Re-run `zkai register`, verify model string and endpoint |
| Gateway returns `503 provider_offline` | Relay has no live WS session for provider | Relay health count, enclave logs | Restart enclave and confirm relay URL/secret env vars |
| Bridge never reaches `synced=true` | Seed invalid, unfunded wallet, or network lag | `deploy/.seed`, bridge logs, faucet funding | Fund wallet, verify seed format, wait full sync cycle |
| `Invalid or missing API key` | Wrong/revoked key | `/api/auth/verify-key`, dashboard key state | Issue new key in dashboard and retry |
| Attestation mismatch | Provider restart, stale state, or tamper | SDK exception details, provider `/attestation`, chain hash | Retry once, then switch provider and investigate |
| `docker compose` starts but no inference | Model still downloading | Enclave logs | Wait for first model pull completion |
| Proof-related tx failures | Proof server unavailable or wrong URL | proof-server container logs, `PROOF_SERVER_URL` | Restart proof server and bridge |

### Common Fix Commands

```bash
zkai restart bridge
zkai restart enclave
zkai logs --follow
docker volume ls | grep bridge_leveldb
```

If bridge state is irrecoverably stuck in development environments, stop containers and reset only after confirming you can resync safely.

---

## Security and Ops Hygiene

- Do not expose bridge port `7300` publicly.
- Rotate wallet/API secrets when access scope changes.
- Keep `deploy/.seed` and `.bridge-seed` file permissions strict.
- Pin model and dependency versions for reproducible behavior.
- Treat `provider/.env` as sensitive operational config.
- Use separate wallets for test and production-like environments.

---

## Change Log Checklist

When updating this runbook, verify all of the following:

1. Contract addresses match deployment defaults.
2. Gateway/relay URLs are current.
3. CLI commands match `cli/zkai_cli/main.py`.
4. Bridge route names match `bridge/src/routes/*`.
5. Provider health examples match `provider/api/main.py`.

