"""
ZKai Provider API — runs inside Gramine TEE enclave.
Endpoints: /pubkey  /infer  /attestation  /health
"""

import os
import uuid
import threading
import requests as _http
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Security
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

import enclave


# ── API key auth ─────────────────────────────────────────────────────────────

_API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

def _load_api_keys() -> set[str]:
    raw = os.environ.get("ZKAI_API_KEYS", "")
    keys = {k.strip() for k in raw.split(",") if k.strip()}
    keys_file = os.environ.get("ZKAI_API_KEYS_FILE")
    if keys_file and os.path.exists(keys_file):
        with open(keys_file) as f:
            keys.update(k.strip() for k in f if k.strip())
    return keys

_API_KEYS = _load_api_keys()

def require_api_key(key: str | None = Security(_API_KEY_HEADER)):
    # If no keys configured, auth is open (dev mode)
    if not _API_KEYS:
        return
    if not key or key not in _API_KEYS:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


# ── Startup ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    enclave.init_enclave()
    mode = "open (dev)" if not _API_KEYS else f"{len(_API_KEYS)} key(s) configured"
    print(f"[api] Provider ready. Auth: {mode}")
    yield


app = FastAPI(lifespan=lifespan)


# ── Models ────────────────────────────────────────────────────────────────────

class InferRequest(BaseModel):
    client_pubkey: str     # ephemeral X25519 pubkey (hex)
    encrypted_prompt: str  # hex(nonce + ciphertext + tag)


class InferResponse(BaseModel):
    job_id: str              # server-generated job ID (used for on-chain tracking)
    encrypted_response: str  # hex(nonce + ciphertext + tag)
    attestation_hash: str    # SHA256 of attestation report


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/pubkey")
def get_pubkey():
    """Returns enclave X25519 public key. Client encrypts prompt with this."""
    return {"pubkey": enclave.get_pubkey_hex()}


@app.post("/infer", response_model=InferResponse)
def infer(req: InferRequest, _=Security(require_api_key)):
    """
    Accepts encrypted prompt, runs inference inside TEE, returns encrypted response.
    Operator CANNOT read prompts or responses.
    """
    # Generate a unique job ID for this request
    job_id = uuid.uuid4().hex + uuid.uuid4().hex  # 64 hex chars = 32 bytes

    try:
        prompt = enclave.decrypt_prompt(req.client_pubkey, req.encrypted_prompt)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Decryption failed: {e}")

    try:
        response_text = enclave.run_inference(prompt)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    encrypted_response = enclave.encrypt_response(req.client_pubkey, response_text)
    att = enclave.get_attestation()
    attestation_hash = att["report_hash"]

    # Post attestation to Midnight chain (non-blocking, provider-side)
    _post_attestation_async(job_id, attestation_hash, att.get("model_hash", "0" * 64))

    return InferResponse(
        job_id=job_id,
        encrypted_response=encrypted_response,
        attestation_hash=attestation_hash,
    )


@app.get("/attestation")
def get_attestation():
    """Full attestation report. SDK hashes this and compares to on-chain anchor."""
    return enclave.get_attestation()


@app.get("/health")
def health():
    return {"status": "ok", "enclave_mode": os.environ.get("GRAMINE_MODE", "direct")}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _post_attestation_async(job_id: str, attestation_hash: str, model_hash: str):
    """Fire-and-forget: post attestation to bridge in background thread."""
    bridge_url = os.environ.get("ZKAI_BRIDGE_URL")
    if not bridge_url:
        return

    def _post():
        try:
            _http.post(
                f"{bridge_url}/attestation/post-attestation",
                json={
                    "job_id": job_id,
                    "attestation_hash": attestation_hash,
                    "model_hash": model_hash,
                },
                timeout=10,
            )
        except Exception as e:
            print(f"[api] Warning: attestation post failed: {e}")

    threading.Thread(target=_post, daemon=True).start()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", "8080")),
    )
