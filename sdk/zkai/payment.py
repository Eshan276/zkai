"""
Midnight payment escrow integration via ZKai bridge server.
"""

from .bridge import BridgeClient


class PaymentClient:
    def __init__(self, wallet_key: str | None = None, bridge_url: str | None = None):
        self.wallet_key = wallet_key
        self._bridge = BridgeClient(bridge_url) if bridge_url else None

    def create_job(self, provider_id: str, token_budget: int, job_id: str) -> str:
        """Lock DUST in escrow. Returns the same job_id."""
        if self._bridge is None:
            return job_id  # local dev no-op

        self._bridge.call("/payment/create-job", {
            "job_id": job_id,
            "provider_id": provider_id,
            "amount": str(token_budget),
        })
        return job_id

    def complete_job(self, job_id: str, attestation_hash: str, token_count: int):
        """Release escrow payment to provider."""
        if self._bridge is None:
            return
        self._bridge.call("/payment/complete-job", {
            "job_id": job_id,
            "attestation_hash": attestation_hash,
        })

    def dispute_job(self, job_id: str):
        """Trigger refund — called automatically on attestation failure."""
        if self._bridge is None:
            return
        self._bridge.call("/payment/dispute-job", {"job_id": job_id})
