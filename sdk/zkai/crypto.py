"""
Client-side encryption primitives.
Matches the enclave's decrypt logic exactly.
"""

import os
import hashlib

from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey, X25519PublicKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat, PrivateFormat, NoEncryption
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305


def generate_keypair() -> tuple[str, str]:
    """Generate ephemeral X25519 keypair. Returns (private_hex, public_hex)."""
    private_key = X25519PrivateKey.generate()
    private_bytes = private_key.private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())
    public_bytes = private_key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    return private_bytes.hex(), public_bytes.hex()


def encrypt(plaintext: str, recipient_pubkey_hex: str, our_private_hex: str) -> str:
    """
    ECDH + ChaCha20-Poly1305 encrypt.
    Returns hex(nonce + ciphertext + tag).
    """
    recipient_pubkey = X25519PublicKey.from_public_bytes(bytes.fromhex(recipient_pubkey_hex))
    our_private = X25519PrivateKey.from_private_bytes(bytes.fromhex(our_private_hex))

    shared_secret = our_private.exchange(recipient_pubkey)
    key = _derive_key(shared_secret)

    nonce = os.urandom(12)
    chacha = ChaCha20Poly1305(key)
    ciphertext = chacha.encrypt(nonce, plaintext.encode("utf-8"), None)
    return (nonce + ciphertext).hex()


def decrypt(encrypted_hex: str, sender_pubkey_hex: str, our_private_hex: str) -> str:
    """
    ECDH + ChaCha20-Poly1305 decrypt.
    encrypted_hex = hex(nonce + ciphertext + tag)
    """
    sender_pubkey = X25519PublicKey.from_public_bytes(bytes.fromhex(sender_pubkey_hex))
    our_private = X25519PrivateKey.from_private_bytes(bytes.fromhex(our_private_hex))

    shared_secret = our_private.exchange(sender_pubkey)
    key = _derive_key(shared_secret)

    data = bytes.fromhex(encrypted_hex)
    nonce = data[:12]
    payload = data[12:]

    chacha = ChaCha20Poly1305(key)
    plaintext = chacha.decrypt(nonce, payload, None)
    return plaintext.decode("utf-8")


def _derive_key(shared_secret: bytes) -> bytes:
    return hashlib.sha256(shared_secret).digest()
