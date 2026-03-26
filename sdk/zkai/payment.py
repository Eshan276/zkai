"""
Midnight payment escrow integration.
Phase 1-2: no-op stubs so SDK works without contracts.
Phase 3+: wire to midnight-js via subprocess or HTTP bridge.
"""


class PaymentClient:
    def __init__(self, wallet_key: str | None = None):
        self.wallet_key = wallet_key
        self._on_chain = wallet_key is not None

    def create_job(self, provider_id: str, token_budget: int) -> str:
        """
        Lock DUST in shielded escrow before sending prompt.
        Returns job_id to reference in complete/dispute.
        Phase 1-2: returns a dummy job_id.
        """
        if not self._on_chain:
            return "local-job-0"

        # TODO Phase 3: call midnight-js PaymentEscrow.createJob()
        raise NotImplementedError("On-chain payment not wired yet")

    def complete_job(self, job_id: str, attestation_hash: str, token_count: int):
        """
        Release escrow payment to provider after successful inference.
        Phase 1-2: no-op.
        """
        if not self._on_chain:
            return

        # TODO Phase 3: call midnight-js PaymentEscrow.completeJob()
        raise NotImplementedError("On-chain payment not wired yet")

    def dispute_job(self, job_id: str):
        """
        Trigger refund — called automatically by SDK on attestation failure.
        Phase 1-2: no-op.
        """
        if not self._on_chain:
            return

        # TODO Phase 3: call midnight-js PaymentEscrow.disputeJob()
        raise NotImplementedError("On-chain payment not wired yet")
