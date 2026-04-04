"""
Enclave state and cryptographic operations.
All secrets live here — private key never leaves this module.
"""

import os
import json
import hashlib
from datetime import datetime, timezone

from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from cryptography.hazmat.primitives.serialization import (
    Encoding, PublicFormat, PrivateFormat, NoEncryption
)
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305


# ── Key generation (runs once at startup, stays in memory) ──────────────────

_private_key: X25519PrivateKey | None = None
_public_key_bytes: bytes | None = None
_attestation: dict | None = None


def init_enclave():
    """Generate keypair and build attestation report. Call once at startup."""
    global _private_key, _public_key_bytes, _attestation

    _private_key = X25519PrivateKey.generate()
    _public_key_bytes = _private_key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)

    _attestation = _build_attestation()
    print(f"[enclave] Initialized. Pubkey: {_public_key_bytes.hex()[:16]}...")


def get_pubkey_hex() -> str:
    return _public_key_bytes.hex()


def get_attestation() -> dict:
    return _attestation


# ── Encryption / Decryption ─────────────────────────────────────────────────

def decrypt_prompt(client_pubkey_hex: str, encrypted_hex: str) -> str:
    """
    ECDH key exchange with client ephemeral key → derive shared secret →
    ChaCha20-Poly1305 decrypt → return plaintext prompt.
    """
    from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PublicKey
    from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

    client_pubkey_bytes = bytes.fromhex(client_pubkey_hex)
    client_pubkey = X25519PublicKey.from_public_bytes(client_pubkey_bytes)

    # ECDH: shared_secret = our_private * client_public
    shared_secret = _private_key.exchange(client_pubkey)
    key = _derive_key(shared_secret)

    ciphertext = bytes.fromhex(encrypted_hex)
    # First 12 bytes = nonce, rest = ciphertext+tag
    nonce = ciphertext[:12]
    payload = ciphertext[12:]

    chacha = ChaCha20Poly1305(key)
    plaintext = chacha.decrypt(nonce, payload, None)
    return plaintext.decode("utf-8")


def encrypt_response(client_pubkey_hex: str, plaintext: str) -> str:
    """
    Encrypt response back to client using same ECDH shared secret.
    Returns hex(nonce + ciphertext + tag).
    """
    from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PublicKey

    client_pubkey_bytes = bytes.fromhex(client_pubkey_hex)
    client_pubkey = X25519PublicKey.from_public_bytes(client_pubkey_bytes)

    shared_secret = _private_key.exchange(client_pubkey)
    key = _derive_key(shared_secret)

    nonce = os.urandom(12)
    chacha = ChaCha20Poly1305(key)
    ciphertext = chacha.encrypt(nonce, plaintext.encode("utf-8"), None)
    return (nonce + ciphertext).hex()


def _derive_key(shared_secret: bytes) -> bytes:
    """HKDF-lite: SHA256 of shared secret → 32-byte ChaCha key."""
    return hashlib.sha256(shared_secret).digest()


# ── Inference ───────────────────────────────────────────────────────────────

def run_inference(prompt: str) -> tuple[str, dict]:
    """
    Call Ollama API for inference.
    Returns (response_text, metrics) where metrics contains token counts,
    inference duration, and CPU/RAM usage sampled during the call.
    """
    import time
    import threading
    import requests as req
    import psutil

    model = os.environ.get("OLLAMA_MODEL", "qwen2.5:1.5b")
    max_tokens = int(os.environ.get("MAX_TOKENS", "512"))

    # Sample CPU and RAM in a background thread while inference runs
    cpu_samples: list[float] = []
    ram_samples: list[float] = []
    _stop = threading.Event()

    def _sample():
        proc = psutil.Process()
        while not _stop.is_set():
            cpu_samples.append(psutil.cpu_percent(interval=None))
            ram_samples.append(proc.memory_info().rss / 1024 / 1024)  # MB
            _stop.wait(0.5)

    sampler = threading.Thread(target=_sample, daemon=True)
    sampler.start()

    t0 = time.time()
    resp = req.post(
        "http://localhost:11434/api/generate",
        json={
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {"num_predict": max_tokens, "temperature": 0.7},
        },
        timeout=120,
    )
    elapsed_ms = int((time.time() - t0) * 1000)
    _stop.set()
    sampler.join(timeout=1)

    resp.raise_for_status()
    data = resp.json()
    text = data["response"].strip()

    metrics = {
        "prompt_tokens": data.get("prompt_eval_count", len(prompt.split())),
        "completion_tokens": data.get("eval_count", len(text.split())),
        "duration_ms": elapsed_ms,
        "cpu_percent": round(sum(cpu_samples) / len(cpu_samples), 1) if cpu_samples else 0.0,
        "ram_mb": round(sum(ram_samples) / len(ram_samples), 1) if ram_samples else 0.0,
    }
    return text, metrics


# ── Attestation ─────────────────────────────────────────────────────────────

def _build_attestation() -> dict:
    """
    Build attestation report at startup.
    Sim mode: self-signed with enclave keypair.
    SGX mode (Phase 5): Intel IAS signs this instead.
    """
    model_path = os.environ.get("MODEL_PATH", "/models/model.gguf")

    report = {
        "model_hash": _hash_file(model_path),
        "manifest_hash": _hash_file("/app/llama.manifest.template"),
        "gramine_mode": os.environ.get("GRAMINE_MODE", "direct"),
        "pubkey": _public_key_bytes.hex(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    # Sign the report with enclave private key
    report_bytes = json.dumps(report, sort_keys=True).encode()
    report["report_hash"] = hashlib.sha256(report_bytes).hexdigest()

    # In SGX mode, replace this with actual IAS attestation quote
    report["signature"] = _sign(report_bytes)

    return report


def _hash_file(path: str) -> str:
    try:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        return h.hexdigest()
    except FileNotFoundError:
        return f"file-not-found:{path}"


def _sign(data: bytes) -> str:
    """Sign data with enclave private key (Ed25519 derived from X25519 seed)."""
    # Simple HMAC-SHA256 signature using shared secret with self
    # In production: use Ed25519 signing key generated alongside X25519 key
    key = _private_key.private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())
    import hmac
    sig = hmac.new(key, data, hashlib.sha256).hexdigest()
    return sig
