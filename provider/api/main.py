"""
ZKai Provider API — runs inside Gramine TEE enclave.
Endpoints: /pubkey  /infer  /v1/chat/completions  /attestation  /health
"""

import os
import time
import uuid
import threading
import requests as _http

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Security
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

import enclave


# ── API key auth ─────────────────────────────────────────────────────────────

_API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

# Central auth server URL — set ZKAI_AUTH_URL to your Next.js deployment
# e.g. https://zkai.vercel.app  or  http://192.168.0.103:3000
_AUTH_URL = os.environ.get("ZKAI_AUTH_URL", "").rstrip("/")

# 60s in-memory cache: key -> (wallet_address, expires_at)
_key_cache: dict[str, tuple[str, float]] = {}


def _verify_key_remote(key: str) -> str | None:
    """Returns wallet_address if valid, None if not. Caches for 60s."""
    now = time.time()
    if key in _key_cache:
        wallet, expires = _key_cache[key]
        if now < expires:
            return wallet
        del _key_cache[key]
    try:
        r = _http.get(
            f"{_AUTH_URL}/api/auth/verify-key",
            params={"key": key},
            timeout=5,
        )
        data = r.json()
        if data.get("valid"):
            wallet = data["wallet_address"]
            _key_cache[key] = (wallet, now + 60)
            return wallet
    except Exception as e:
        print(f"[auth] verify-key request failed: {e}")
    return None


def require_api_key(key: str | None = Security(_API_KEY_HEADER)) -> str | None:
    """Returns wallet_address of the caller, or raises 401."""
    if not _AUTH_URL:
        return None
    if not key:
        raise HTTPException(status_code=401, detail="Missing X-API-Key header")
    wallet = _verify_key_remote(key)
    if not wallet:
        raise HTTPException(status_code=401, detail="Invalid or revoked API key")
    return wallet


def _wallet_from_header_or_key(
    req_wallet: str | None,
    key: str | None,
) -> str | None:
    """
    When called via the gateway, X-Wallet-Address is forwarded directly.
    When called directly (SDK), derive from key verification.
    """
    if req_wallet:
        return req_wallet
    if key and _AUTH_URL:
        return _verify_key_remote(key)
    return None


# ── Startup ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    enclave.init_enclave()
    mode = "open (dev)" if not _AUTH_URL else f"centralized auth @ {_AUTH_URL}"
    print(f"[api] Provider ready. Auth: {mode}")
    yield


app = FastAPI(lifespan=lifespan)


# ── Models ────────────────────────────────────────────────────────────────────

class InferRequest(BaseModel):
    client_pubkey: str     # ephemeral X25519 pubkey (hex)
    encrypted_prompt: str  # hex(nonce + ciphertext + tag)


class InferResponse(BaseModel):
    job_id: str              # server-generated job ID
    encrypted_response: str  # hex(nonce + ciphertext + tag)
    attestation_hash: str    # SHA256 of attestation report


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str = ""
    messages: list[ChatMessage]
    stream: bool = False


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/pubkey")
def get_pubkey():
    """Returns enclave X25519 public key."""
    return {"pubkey": enclave.get_pubkey_hex()}


@app.post("/infer", response_model=InferResponse)
def infer(
    req: InferRequest,
    wallet_address: str | None = Security(require_api_key),
):
    """
    Encrypted inference endpoint (used by ZKai SDK directly).
    Accepts encrypted prompt, returns encrypted response.
    """
    job_id = uuid.uuid4().hex + uuid.uuid4().hex

    try:
        prompt = enclave.decrypt_prompt(req.client_pubkey, req.encrypted_prompt)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Decryption failed: {e}")

    try:
        response_text, metrics = enclave.run_inference(prompt)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    encrypted_response = enclave.encrypt_response(req.client_pubkey, response_text)
    att = enclave.get_attestation()
    attestation_hash = att["report_hash"]

    _post_attestation_async(job_id, attestation_hash, att.get("model_hash", "0" * 64))
    _deduct_balance_async(job_id, wallet_address or "")

    return InferResponse(
        job_id=job_id,
        encrypted_response=encrypted_response,
        attestation_hash=attestation_hash,
    )


@app.post("/v1/chat/completions")
async def chat_completions(
    request: Request,
    req: ChatCompletionRequest,
    wallet_address: str | None = Security(require_api_key),
):
    """
    OpenAI-compatible endpoint — used by the ZKai gateway.
    Plain-text in/out (encryption is gateway→enclave channel, not required here
    since the gateway is our own infra; the TEE still protects inference).
    """
    job_id = uuid.uuid4().hex + uuid.uuid4().hex

    # X-Coin-Public-Key is the shielded key used as the escrow balance map key
    coin_public_key = request.headers.get("x-coin-public-key") or wallet_address or ""
    print(f"[api] coin_public_key={coin_public_key[:16] if coin_public_key else 'MISSING'}... wallet={wallet_address}")

    # Build prompt from messages
    prompt = _messages_to_prompt(req.messages)

    try:
        response_text, metrics = enclave.run_inference(prompt)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    att = enclave.get_attestation()
    attestation_hash = att["report_hash"]

    _post_attestation_async(job_id, attestation_hash, att.get("model_hash", "0" * 64))
    _deduct_balance_async(job_id, coin_public_key)

    return {
        "id": f"chatcmpl-{job_id[:8]}",
        "object": "chat.completion",
        "model": req.model or os.environ.get("OLLAMA_MODEL", "unknown"),
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": response_text},
            "finish_reason": "stop",
        }],
        "usage": {
            "prompt_tokens": metrics["prompt_tokens"],
            "completion_tokens": metrics["completion_tokens"],
        },
        "x_zkai": {
            "job_id": job_id,
            "attestation_hash": attestation_hash,
            "duration_ms": metrics["duration_ms"],
            "cpu_percent": metrics["cpu_percent"],
            "ram_mb": metrics["ram_mb"],
        },
    }


@app.get("/attestation")
def get_attestation():
    """Full attestation report."""
    return enclave.get_attestation()


@app.get("/health")
def health():
    hw: dict = {}
    try:
        # CPU model
        with open("/proc/cpuinfo") as f:
            for line in f:
                if line.startswith("model name"):
                    hw["cpu_model"] = line.split(":", 1)[1].strip()
                    break
        # Core count
        import subprocess
        hw["cpu_cores"] = int(subprocess.check_output(["nproc"]).strip())
        # RAM total (MB)
        with open("/proc/meminfo") as f:
            for line in f:
                if line.startswith("MemTotal"):
                    hw["ram_total_mb"] = int(line.split()[1]) // 1024
                    break
    except Exception:
        pass
    return {"status": "ok", "enclave_mode": os.environ.get("GRAMINE_MODE", "direct"), "hardware": hw}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _messages_to_prompt(messages: list[ChatMessage]) -> str:
    parts = []
    for m in messages:
        if m.role == "system":
            parts.append(f"System: {m.content}")
        elif m.role == "user":
            parts.append(f"User: {m.content}")
        elif m.role == "assistant":
            parts.append(f"Assistant: {m.content}")
    parts.append("Assistant:")
    return "\n".join(parts)


def _post_attestation_async(job_id: str, attestation_hash: str, model_hash: str):
    bridge_url = os.environ.get("ZKAI_BRIDGE_URL")
    if not bridge_url:
        return

    def _post():
        try:
            _http.post(
                f"{bridge_url}/attestation/post-attestation",
                json={"job_id": job_id, "attestation_hash": attestation_hash, "model_hash": model_hash},
                timeout=10,
            )
        except Exception as e:
            print(f"[api] Warning: attestation post failed: {e}")

    threading.Thread(target=_post, daemon=True).start()


def _deduct_balance_async(job_id: str, wallet_address: str):
    bridge_url = os.environ.get("ZKAI_BRIDGE_URL")
    if not bridge_url or not wallet_address:
        return

    price = int(os.environ.get("ZKAI_PRICE_PER_REQUEST", "1"))
    provider_id = _get_provider_id()

    def _deduct():
        try:
            r = _http.post(
                f"{bridge_url}/payment/deduct-balance",
                json={
                    "job_id": job_id,
                    "wallet_address": wallet_address,
                    "provider_id": provider_id,
                    "amount": str(price),
                },
                timeout=120,
            )
            print(f"[api] deduct-balance: {r.status_code} {r.text[:120]}")
        except Exception as e:
            print(f"[api] Warning: balance deduction failed: {e}")

    threading.Thread(target=_deduct, daemon=True).start()


def _get_provider_id() -> str:
    """Load provider ID from .provider_id file written by zkai register."""
    import json as _json
    paths = [
        "/app/.provider_id",
        "/provider/.provider_id",
        os.path.join(os.path.dirname(__file__), ".provider_id"),
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                return _json.loads(open(p).read())["provider_id"]
            except Exception:
                pass
    return "0" * 64


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", "8080")),
    )
