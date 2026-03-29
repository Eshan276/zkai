"""
ZKai client — OpenAI-compatible interface.
Drop-in replacement: change 2 lines, everything else stays the same.
"""

import uuid

import requests
from dataclasses import dataclass, field

from . import crypto, provider as provider_mod, attestation as att_mod
from .attestation import ZKaiAttestationError
from .payment import PaymentClient


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
        api_key: str | None = None,
        provider_endpoint: str | None = None,
        max_price: float | None = None,
        min_reputation: float = 0.0,
        registry_contract: str | None = None,
        attestation_contract: str | None = None,
        skip_attestation: bool = False,
        bridge_url: str | None = None,
        token_budget: int = 1000,
    ):
        self._api_key = api_key
        self._provider_endpoint = provider_endpoint
        self._max_price = max_price
        self._min_reputation = min_reputation
        self._registry_contract = registry_contract
        self._attestation_contract = attestation_contract
        self._skip_attestation = skip_attestation
        self._payment = PaymentClient(bridge_url=bridge_url)
        self._token_budget = token_budget
        self.chat = _Chat(self)

    def _infer(self, model: str, messages: list[dict]) -> ChatCompletion:
        # 1. Build prompt
        prompt = _messages_to_prompt(messages)

        # 2. Pick provider — direct endpoint overrides registry lookup
        if self._provider_endpoint:
            p = provider_mod.Provider(
                id="direct",
                endpoint=self._provider_endpoint,
                pubkey="",
                model=model,
                price_per_token=0.0,
                reputation=1.0,
                stake=0.0,
            )
        else:
            p = provider_mod.select_provider(
                model=model,
                max_price=self._max_price,
                min_reputation=self._min_reputation,
                registry_contract=self._registry_contract,
            )

        # 3. Fetch live TEE pubkey
        tee_pubkey = provider_mod.fetch_pubkey(p)

        # 4. Generate ephemeral keypair + encrypt prompt
        our_private, our_public = crypto.generate_keypair()
        encrypted_prompt = crypto.encrypt(prompt, tee_pubkey, our_private)

        # 5. Lock escrow payment on-chain (no-op if no bridge_url configured)
        job_id = uuid.uuid4().hex + uuid.uuid4().hex  # 64 hex = 32 bytes
        self._payment.create_job(
            provider_id=p.id,
            token_budget=self._token_budget,
            job_id=job_id,
        )

        # 6. Send to provider
        headers = {"X-API-Key": self._api_key} if self._api_key else {}
        resp = requests.post(
            f"{p.endpoint}/infer",
            json={
                "client_pubkey": our_public,
                "encrypted_prompt": encrypted_prompt,
                "job_id": job_id,
            },
            headers=headers,
            timeout=120,
        )
        if resp.status_code == 401:
            self._payment.dispute_job(job_id)
            raise ZKaiAuthError("Invalid or missing API key. Get one from your provider.")
        resp.raise_for_status()
        data = resp.json()

        # Use provider's job_id if returned (allows provider to track same job)
        provider_job_id = data.get("job_id", job_id)

        # 7. Verify attestation (silent — raises ZKaiAttestationError on failure → refund)
        if not self._skip_attestation:
            try:
                att_mod.verify(
                    provider_url=p.endpoint,
                    received_attestation_hash=data["attestation_hash"],
                    attestation_contract=self._attestation_contract,
                    job_id=provider_job_id,
                )
            except ZKaiAttestationError:
                self._payment.dispute_job(job_id)
                raise

        # 8. Decrypt response
        response_text = crypto.decrypt(data["encrypted_response"], tee_pubkey, our_private)
        token_count = len(response_text.split())

        # 9. Release escrow to provider
        self._payment.complete_job(
            job_id=job_id,
            attestation_hash=data.get("attestation_hash", ""),
            token_count=token_count,
        )

        return ChatCompletion(
            id=f"zkai-{job_id[:8]}",
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


# ── Exceptions ───────────────────────────────────────────────────────────────

class ZKaiAuthError(Exception):
    pass


# ── Helpers ──────────────────────────────────────────────────────────────────

def _messages_to_prompt(messages: list[dict]) -> str:
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
