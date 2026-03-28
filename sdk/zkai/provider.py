"""
Provider discovery and selection.
- No registry_contract: local dev stub (localhost:8080)
- With registry_contract: queries Midnight indexer GraphQL for on-chain providers
"""

import requests
from dataclasses import dataclass

INDEXER_URL = "https://indexer.preprod.midnight.network/api/v3/graphql"


@dataclass
class Provider:
    id: str
    endpoint: str
    pubkey: str
    model: str
    price_per_token: float
    reputation: float
    stake: float


def select_provider(
    model: str,
    max_price: float | None = None,
    min_reputation: float = 0.0,
    registry_contract: str | None = None,
) -> Provider:
    """Pick the best available provider. Ranked by reputation desc, price asc."""
    providers = _get_providers(registry_contract)

    candidates = [
        p for p in providers
        if p.model == model
        and (max_price is None or p.price_per_token <= max_price)
        and p.reputation >= min_reputation
    ]

    if not candidates:
        raise RuntimeError(
            f"No providers available for model '{model}' "
            f"within price/reputation constraints."
        )

    candidates.sort(key=lambda p: (-p.reputation, p.price_per_token))
    return candidates[0]


def fetch_pubkey(provider: Provider) -> str:
    """Fetch current TEE pubkey from provider (may rotate on restart)."""
    resp = requests.get(f"{provider.endpoint}/pubkey", timeout=10)
    resp.raise_for_status()
    return resp.json()["pubkey"]


def _get_providers(registry_contract: str | None) -> list[Provider]:
    if registry_contract is None:
        return _get_providers_stub()
    return _get_providers_from_chain(registry_contract)


def _get_providers_from_chain(registry_contract: str) -> list[Provider]:
    """
    Query Midnight indexer GraphQL for active providers in the ProviderRegistry.
    The contract's export ledger maps are publicly readable.
    """
    query = """
    query GetContractState($address: String!) {
      contract(address: $address) {
        state {
          ... on ContractState {
            ledger {
              ... on ZkaiProviderRegistryLedger {
                provider_active { entries { key value } }
                provider_endpoint { entries { key value } }
                provider_model { entries { key value } }
                provider_price { entries { key value } }
                provider_reputation { entries { key value } }
                provider_pubkey { entries { key value } }
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
            json={"query": query, "variables": {"address": registry_contract}},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        ledger = data.get("data", {}).get("contract", {}).get("state", {}).get("ledger", {})

        if not ledger:
            # Indexer schema may differ — fall back to stub with a warning
            print("Warning: Could not parse on-chain providers, falling back to stub")
            return _get_providers_stub()

        active_entries = {e["key"]: e["value"] for e in ledger.get("provider_active", {}).get("entries", [])}
        endpoint_entries = {e["key"]: e["value"] for e in ledger.get("provider_endpoint", {}).get("entries", [])}
        model_entries = {e["key"]: e["value"] for e in ledger.get("provider_model", {}).get("entries", [])}
        price_entries = {e["key"]: e["value"] for e in ledger.get("provider_price", {}).get("entries", [])}
        rep_entries = {e["key"]: e["value"] for e in ledger.get("provider_reputation", {}).get("entries", [])}
        pubkey_entries = {e["key"]: e["value"] for e in ledger.get("provider_pubkey", {}).get("entries", [])}

        providers = []
        for pid, active in active_entries.items():
            if not active:
                continue
            providers.append(Provider(
                id=pid,
                endpoint=endpoint_entries.get(pid, ""),
                pubkey=pubkey_entries.get(pid, ""),
                model=model_entries.get(pid, ""),
                price_per_token=float(price_entries.get(pid, 0)),
                reputation=float(rep_entries.get(pid, 500000)) / 1_000_000,
                stake=0.0,
            ))
        return providers if providers else _get_providers_stub()

    except Exception as e:
        print(f"Warning: Failed to fetch on-chain providers ({e}), falling back to stub")
        return _get_providers_stub()


def _get_providers_stub() -> list[Provider]:
    """Local dev stub — points to localhost enclave."""
    return [
        Provider(
            id="local-dev",
            endpoint="http://localhost:8080",
            pubkey="",
            model="qwen2.5-1.5b",
            price_per_token=0.0,
            reputation=1.0,
            stake=0.0,
        )
    ]
