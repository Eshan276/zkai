"""
ZKai Provider API — runs inside Gramine TEE enclave.
Three endpoints: /pubkey, /infer, /attestation
"""

import os
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import enclave


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Generate keypair + build attestation at startup (inside enclave)
    enclave.init_enclave()
    print("[api] Provider ready.")
    yield


app = FastAPI(lifespan=lifespan)


# ── Request / Response models ────────────────────────────────────────────────

class InferRequest(BaseModel):
    client_pubkey: str    # client's ephemeral X25519 pubkey (hex)
    encrypted_prompt: str # hex(nonce + ciphertext + tag)


class InferResponse(BaseModel):
    encrypted_response: str  # hex(nonce + ciphertext + tag)
    attestation_hash: str    # SHA256 of attestation report — user verifies on-chain


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/pubkey")
def get_pubkey():
    """
    Returns enclave's X25519 public key.
    Client uses this to encrypt their prompt before sending.
    """
    return {"pubkey": enclave.get_pubkey_hex()}


@app.post("/infer", response_model=InferResponse)
def infer(req: InferRequest):
    """
    Accepts encrypted prompt, runs inference inside TEE, returns encrypted response.
    Operator running this container CANNOT read prompt or response.
    """
    try:
        # Decrypt inside enclave — plaintext never leaves TEE
        prompt = enclave.decrypt_prompt(req.client_pubkey, req.encrypted_prompt)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Decryption failed: {e}")

    try:
        response_text = enclave.run_inference(prompt)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Re-encrypt response for client
    encrypted_response = enclave.encrypt_response(req.client_pubkey, response_text)

    # Include attestation hash so client can verify on-chain
    att = enclave.get_attestation()
    attestation_hash = att["report_hash"]

    return InferResponse(
        encrypted_response=encrypted_response,
        attestation_hash=attestation_hash,
    )


@app.get("/attestation")
def get_attestation():
    """
    Returns full attestation report.
    Client (or SDK) hashes this and compares to on-chain anchor.
    In SGX mode: this includes Intel IAS signature.
    """
    return enclave.get_attestation()


@app.get("/health")
def health():
    return {"status": "ok", "enclave_mode": os.environ.get("GRAMINE_MODE", "direct")}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", "8080")),
    )
