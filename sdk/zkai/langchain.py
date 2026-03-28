"""
LangChain adapter — one line change from ChatOpenAI.

Before:
    from langchain_openai import ChatOpenAI
    llm = ChatOpenAI(model="gpt-4")

After:
    from zkai import ChatZKai
    llm = ChatZKai(model="qwen2.5-1.5b", api_key="your-key")
"""

from typing import Any, List, Optional
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage
from langchain_core.outputs import ChatGeneration, ChatResult

from .client import ZKai


class ChatZKai(BaseChatModel):
    model: str = "qwen2.5-1.5b"
    api_key: Optional[str] = None
    max_price: Optional[float] = None
    min_reputation: float = 0.0
    registry_contract: Optional[str] = None
    attestation_contract: Optional[str] = None
    skip_attestation: bool = False

    @property
    def _llm_type(self) -> str:
        return "zkai"

    def _get_client(self) -> ZKai:
        return ZKai(
            api_key=self.api_key,
            max_price=self.max_price,
            min_reputation=self.min_reputation,
            registry_contract=self.registry_contract,
            attestation_contract=self.attestation_contract,
            skip_attestation=self.skip_attestation,
        )

    def _generate(self, messages: List[BaseMessage], **kwargs: Any) -> ChatResult:
        openai_messages = [
            {"role": _lc_role(m), "content": m.content}
            for m in messages
        ]
        completion = self._get_client().chat.completions.create(
            model=self.model,
            messages=openai_messages,
        )
        text = completion.choices[0].message.content
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=text))])


def _lc_role(message: BaseMessage) -> str:
    from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
    if isinstance(message, SystemMessage):
        return "system"
    if isinstance(message, AIMessage):
        return "assistant"
    return "user"
