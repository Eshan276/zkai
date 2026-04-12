"""
ZKai client — OpenAI-compatible interface.
Drop-in replacement: change 2 lines, everything else stays the same.
"""

import requests
from dataclasses import dataclass, field

from . import crypto, provider as provider_mod, attestation as att_mod
from .attestation import ZKaiAttestationError

# Default gateway — consumers send requests here, gateway picks a provider
GATEWAY_URL = "https://zkai.vercel.app"


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
        base_url: str | None = None,
        # legacy / advanced: bypass gateway and talk to a provider directly
        provider_endpoint: str | None = None,
        max_price: float | None = None,
        min_reputation: float = 0.0,
        registry_contract: str | None = None,
        attestation_contract: str | None = None,
        skip_attestation: bool = False,
    ):
        self._api_key = api_key
        # base_url points to the ZKai gateway (or a self-hosted one)
        self._base_url = (base_url or GATEWAY_URL).rstrip("/")
        # provider_endpoint bypasses the gateway entirely (advanced / dev use)
        self._provider_endpoint = provider_endpoint
        self._max_price = max_price
        self._min_reputation = min_reputation
        self._registry_contract = registry_contract
        self._attestation_contract = attestation_contract
        self._skip_attestation = skip_attestation
        self.chat = _Chat(self)

    def _infer(self, model: str, messages: list[dict]) -> ChatCompletion:
        # ── Gateway mode (default) ────────────────────────────────────────────
        if not self._provider_endpoint:
            return self._infer_via_gateway(model, messages)

        # ── Direct provider mode (advanced) ──────────────────────────────────
        return self._infer_direct(model, messages)

    def _infer_via_gateway(self, model: str, messages: list[dict]) -> ChatCompletion:
        """Send request to the ZKai gateway (plain OpenAI-compatible call)."""
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["X-API-Key"] = self._api_key

        resp = requests.post(
            f"{self._base_url}/api/v1/chat/completions",
            json={"model": model, "messages": messages},
            headers=headers,
            timeout=120,
        )
        if resp.status_code == 401:
            raise ZKaiAuthError("Invalid or missing API key. Get one at https://zkai.dev")
        if resp.status_code == 503:
            raise ZKaiNoProviderError("No providers available for this model.")
        resp.raise_for_status()
        data = resp.json()

        choice = data["choices"][0]
        return ChatCompletion(
            id=data.get("id", "zkai-gateway"),
            object="chat.completion",
            model=data.get("model", model),
            choices=[Choice(
                index=0,
                message=Message(role="assistant", content=choice["message"]["content"]),
                finish_reason=choice.get("finish_reason", "stop"),
            )],
            usage=data.get("usage", {}),
        )

    def _infer_direct(self, model: str, messages: list[dict]) -> ChatCompletion:
        """Bypass gateway — encrypt and send directly to a provider enclave."""
        prompt = _messages_to_prompt(messages)

        p = provider_mod.Provider(
            id="direct",
            endpoint=self._provider_endpoint,
            pubkey="",
            model=model,
            price_per_token=0.0,
            reputation=1.0,
            stake=0.0,
        )

        tee_pubkey = provider_mod.fetch_pubkey(p)
        our_private, our_public = crypto.generate_keypair()
        encrypted_prompt = crypto.encrypt(prompt, tee_pubkey, our_private)

        headers = {"X-API-Key": self._api_key} if self._api_key else {}
        resp = requests.post(
            f"{p.endpoint}/infer",
            json={"client_pubkey": our_public, "encrypted_prompt": encrypted_prompt},
            headers=headers,
            timeout=120,
        )
        if resp.status_code == 401:
            raise ZKaiAuthError("Invalid or missing API key.")
        resp.raise_for_status()
        data = resp.json()

        job_id = data["job_id"]

        if not self._skip_attestation:
            att_mod.verify(
                provider_url=p.endpoint,
                received_attestation_hash=data["attestation_hash"],
                attestation_contract=self._attestation_contract,
                job_id=job_id,
            )

        response_text = crypto.decrypt(data["encrypted_response"], tee_pubkey, our_private)
        token_count = len(response_text.split())

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


class ZKaiNoProviderError(Exception):
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
