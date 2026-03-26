"""
Attestation verification.
SDK calls this silently after every inference — user never thinks about it.
"""

import hashlib
import json
import requests


class ZKaiAttestationError(Exception):
    pass


def verify(provider_url: str, received_attestation_hash: str, on_chain_hash: str | None = None):
    """
    Fetch attestation from provider, hash it, compare to:
    1. The hash included in the /infer response
    2. The hash anchored on-chain (when contracts are live)

    Raises ZKaiAttestationError if anything doesn't match.
    """
    resp = requests.get(f"{provider_url}/attestation", timeout=10)
    resp.raise_for_status()
    attestation = resp.json()

    # Recompute hash of the report (excluding the hash field itself)
    report_copy = {k: v for k, v in attestation.items() if k not in ("report_hash", "signature")}
    report_bytes = json.dumps(report_copy, sort_keys=True).encode()
    computed_hash = hashlib.sha256(report_bytes).hexdigest()

    if computed_hash != received_attestation_hash:
        raise ZKaiAttestationError(
            f"Attestation hash mismatch.\n"
            f"  From provider response: {received_attestation_hash}\n"
            f"  Recomputed:             {computed_hash}\n"
            f"  Provider may have tampered with the report."
        )

    if on_chain_hash and computed_hash != on_chain_hash:
        raise ZKaiAttestationError(
            f"Attestation does not match on-chain anchor.\n"
            f"  On-chain:   {on_chain_hash}\n"
            f"  Computed:   {computed_hash}\n"
            f"  Model hash: {attestation.get('model_hash', 'unknown')}\n"
            f"  Expected a different model or manifest was used."
        )

    return attestation
