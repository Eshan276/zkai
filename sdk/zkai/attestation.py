"""
Attestation verification.
SDK calls this silently after every inference — user never thinks about it.
"""

import hashlib
import json
import requests

INDEXER_URL = "https://indexer.preprod.midnight.network/api/v3/graphql"


class ZKaiAttestationError(Exception):
    pass


def verify(
    provider_url: str,
    received_attestation_hash: str,
    on_chain_hash: str | None = None,
    attestation_contract: str | None = None,
    job_id: str | None = None,
):
    """
    Fetch attestation from provider, hash it, compare to:
    1. The hash included in the /infer response
    2. The hash anchored on-chain (if attestation_contract + job_id provided)

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

    # Fetch on-chain hash if not provided directly
    if on_chain_hash is None and attestation_contract and job_id:
        on_chain_hash = _fetch_on_chain_hash(attestation_contract, job_id)

    if on_chain_hash and computed_hash != on_chain_hash:
        raise ZKaiAttestationError(
            f"Attestation does not match on-chain anchor.\n"
            f"  On-chain:   {on_chain_hash}\n"
            f"  Computed:   {computed_hash}\n"
            f"  Model hash: {attestation.get('model_hash', 'unknown')}\n"
            f"  Possible tampered model or manifest."
        )

    return attestation


def _fetch_on_chain_hash(attestation_contract: str, job_id: str) -> str | None:
    """Query Midnight indexer for the attestation hash stored for a given job_id."""
    query = """
    query GetAttestation($address: String!) {
      contract(address: $address) {
        state {
          ... on ContractState {
            ledger {
              ... on ZkaiAttestationRegistryLedger {
                att_hash { entries { key value } }
              }
            }
          }
        }
      }
    }
    """
    try:
        resp = requests.post(
            INDEXER_URL,
            json={"query": query, "variables": {"address": attestation_contract}},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        entries = (
            data.get("data", {})
            .get("contract", {})
            .get("state", {})
            .get("ledger", {})
            .get("att_hash", {})
            .get("entries", [])
        )
        for entry in entries:
            if entry["key"] == job_id:
                return entry["value"]
        return None
    except Exception:
        return None
