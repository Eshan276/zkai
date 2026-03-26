"""
ZKai client — OpenAI-compatible interface.
Drop-in replacement: change 2 lines, everything else stays the same.
"""

import requests
from dataclasses import dataclass, field

from . import crypto, provider as provider_mod, payment as payment_mod, attestation as att_mod
from .attestation import ZKaiAttestationError


# ── OpenAI-compatible response types ────────────────────────────────────────

@dataclass
class Message:
    role: str
    content: str


@dataclass
class Choice:
    index: int
    message: Message
    finish_reason: str = "stop"


@dataclass
class ChatCompletion:
    id: str
    object: str
    model: str
    choices: list[Choice]
    usage: dict = field(default_factory=dict)


# ── Main client ──────────────────────────────────────────────────────────────

class ZKai:
    def __init__(
        self,
        wallet_key: str | None = None,
        max_price: float | None = None,
        min_reputation: float = 0.0,
        registry_contract: str | None = None,
        skip_attestation: bool = False,
    ):
        self._wallet_key = wallet_key
        self._max_price = max_price
        self._min_reputation = min_reputation
        self._registry_contract = registry_contract
        self._skip_attestation = skip_attestation
        self._payment = payment_mod.PaymentClient(wallet_key)
        self.chat = _Chat(self)

    def _infer(self, model: str, messages: list[dict]) -> ChatCompletion:
        # 1. Build prompt from messages (simple concatenation for now)
        prompt = _messages_to_prompt(messages)

        # 2. Pick provider
        p = provider_mod.select_provider(
            model=model,
            max_price=self._max_price,
            min_reputation=self._min_reputation,
            registry_contract=self._registry_contract,
        )

        # 3. Fetch live TEE pubkey
        tee_pubkey = provider_mod.fetch_pubkey(p)

        # 4. Generate ephemeral keypair for this request
        our_private, our_public = crypto.generate_keypair()

        # 5. Encrypt prompt
        encrypted_prompt = crypto.encrypt(prompt, tee_pubkey, our_private)

        # 6. Create escrow job (no-op in Phase 1-2)
        token_budget = len(prompt.split()) * 2  # rough estimate
        job_id = self._payment.create_job(p.id, token_budget)

        # 7. Send to provider
        resp = requests.post(
            f"{p.endpoint}/infer",
            json={
                "client_pubkey": our_public,
                "encrypted_prompt": encrypted_prompt,
            },
            timeout=120,
        )
        resp.raise_for_status()
        data = resp.json()

        # 8. Verify attestation (silent — raises ZKaiAttestationError on failure)
        if not self._skip_attestation:
            try:
                att_mod.verify(
                    provider_url=p.endpoint,
                    received_attestation_hash=data["attestation_hash"],
                    on_chain_hash=None,  # Phase 3+: fetch from AttestationRegistry
                )
            except ZKaiAttestationError:
                self._payment.dispute_job(job_id)
                raise

        # 9. Decrypt response
        response_text = crypto.decrypt(data["encrypted_response"], tee_pubkey, our_private)

        # 10. Release payment (no-op in Phase 1-2)
        token_count = len(response_text.split())
        self._payment.complete_job(job_id, data["attestation_hash"], token_count)

        return ChatCompletion(
            id=f"zkai-{job_id}",
            object="chat.completion",
            model=model,
            choices=[Choice(index=0, message=Message(role="assistant", content=response_text))],
            usage={"prompt_tokens": len(prompt.split()), "completion_tokens": token_count},
        )


class _Chat:
    def __init__(self, client: ZKai):
        self.completions = _Completions(client)


class _Completions:
    def __init__(self, client: ZKai):
        self._client = client

    def create(self, model: str, messages: list[dict], **kwargs) -> ChatCompletion:
        return self._client._infer(model, messages)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _messages_to_prompt(messages: list[dict]) -> str:
    """Convert OpenAI messages list to a flat prompt string for llama.cpp."""
    parts = []
    for m in messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        if role == "system":
            parts.append(f"System: {content}")
        elif role == "user":
            parts.append(f"User: {content}")
        elif role == "assistant":
            parts.append(f"Assistant: {content}")
    parts.append("Assistant:")
    return "\n".join(parts)
