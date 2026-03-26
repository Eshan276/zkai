"""
Provider discovery and selection.
Fetches provider list from Midnight registry contract, picks best match.
Phase 3+: replace _get_providers_stub() with real contract call.
"""

import requests
from dataclasses import dataclass


@dataclass
class Provider:
    id: str
    endpoint: str       # e.g. https://provider.example.com:8080
    pubkey: str         # TEE X25519 pubkey (hex)
    model: str          # e.g. qwen2.5-1.5b
    price_per_token: float  # DUST per token
    reputation: float   # 0.0 - 1.0
    stake: float        # DUST staked


def select_provider(
    model: str,
    max_price: float | None = None,
    min_reputation: float = 0.0,
    registry_contract: str | None = None,
) -> Provider:
    """
    Pick the best available provider for the given model.
    Ranked by: reputation desc, then price asc.
    """
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

    # Best = highest reputation, then lowest price
    candidates.sort(key=lambda p: (-p.reputation, p.price_per_token))
    return candidates[0]


def fetch_pubkey(provider: Provider) -> str:
    """Fetch current TEE pubkey from provider (may rotate on restart)."""
    resp = requests.get(f"{provider.endpoint}/pubkey", timeout=10)
    resp.raise_for_status()
    return resp.json()["pubkey"]


def _get_providers(registry_contract: str | None) -> list[Provider]:
    """
    Phase 1-2: returns stub local provider for dev.
    Phase 3+: query Midnight ProviderRegistry contract.
    """
    if registry_contract is None:
        return _get_providers_stub()

    # TODO Phase 3: call midnight-js to query ProviderRegistry.getProviders()
    raise NotImplementedError("On-chain registry not wired yet — pass registry_contract=None for local dev")


def _get_providers_stub() -> list[Provider]:
    """Local dev stub — points to localhost enclave."""
    return [
        Provider(
            id="local-dev",
            endpoint="http://localhost:8080",
            pubkey="",           # fetched live from /pubkey
            model="qwen2.5-1.5b",
            price_per_token=0.0,
            reputation=1.0,
            stake=0.0,
        )
    ]
