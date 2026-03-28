"""
HTTP client for the ZKai bridge server (Node.js).
The bridge holds the Midnight wallet and translates Python calls into on-chain transactions.
"""

import requests


class BridgeClient:
    def __init__(self, base_url: str = "http://localhost:7300"):
        self.base_url = base_url.rstrip("/")

    def call(self, path: str, payload: dict) -> dict:
        resp = requests.post(
            f"{self.base_url}{path}",
            json=payload,
            timeout=120,  # ZK proofs can take 30-60s
        )
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            raise RuntimeError(f"Bridge error on {path}: {data['error']}")
        return data

    def health(self) -> dict:
        resp = requests.get(f"{self.base_url}/health", timeout=10)
        resp.raise_for_status()
        return resp.json()
