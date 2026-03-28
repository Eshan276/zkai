from .client import ZKai, ChatCompletion, ZKaiAuthError
from .attestation import ZKaiAttestationError

def __getattr__(name):
    if name == "ChatZKai":
        from .langchain import ChatZKai
        return ChatZKai
    raise AttributeError(f"module 'zkai' has no attribute {name!r}")

__all__ = ["ZKai", "ChatCompletion", "ZKaiAuthError", "ZKaiAttestationError", "ChatZKai"]
