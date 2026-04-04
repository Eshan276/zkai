"""
ZKai WebSocket relay client — runs inside the enclave container.

Connects outbound to the Fly.io relay, receives inference requests,
forwards them to the local enclave (port 8080), sends responses back.
Reconnects automatically with exponential backoff on disconnect.
"""

import asyncio
import json
import os
import sys
import time
import urllib.request

RELAY_URL = os.environ.get("ZKAI_RELAY_URL", "").rstrip("/")
RELAY_SECRET = os.environ.get("ZKAI_RELAY_SECRET", "")
PROVIDER_ID_FILE = "/app/.provider_id"
ENCLAVE_URL = "http://localhost:8080"


def load_provider_id() -> str:
    try:
        with open(PROVIDER_ID_FILE) as f:
            data = json.load(f)
        return data["provider_id"]
    except Exception as e:
        print(f"[relay] ERROR: cannot read provider_id from {PROVIDER_ID_FILE}: {e}", flush=True)
        sys.exit(1)


def forward_to_enclave(path: str, headers: dict, body: dict) -> tuple[int, dict]:
    """HTTP POST to local enclave, returns (status_code, response_body)."""
    url = f"{ENCLAVE_URL}{path}"
    payload = json.dumps(body).encode()
    req = urllib.request.Request(url, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    for k, v in headers.items():
        if k.lower() not in ("content-length", "transfer-encoding", "host"):
            req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=115) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read())
        except Exception:
            body = {"error": str(e)}
        return e.code, body
    except Exception as e:
        return 500, {"error": str(e)}


async def handle_message(ws, msg: dict):
    if msg.get("type") == "ping":
        await ws.send(json.dumps({"type": "pong"}))
        return

    if msg.get("type") != "request":
        return

    correlation_id = msg.get("correlation_id")
    headers = msg.get("headers", {})
    body = msg.get("body", {})
    path = msg.get("path", "/v1/chat/completions")

    print(f"[relay] → request {correlation_id[:8]}...", flush=True)
    status, response_body = await asyncio.get_event_loop().run_in_executor(
        None, forward_to_enclave, path, headers, body
    )
    print(f"[relay] ← response {correlation_id[:8]}... status={status}", flush=True)

    await ws.send(json.dumps({
        "type": "response",
        "correlation_id": correlation_id,
        "status": status,
        "body": response_body,
    }))


async def connect(provider_id: str):
    import websockets

    ws_url = RELAY_URL.replace("https://", "wss://").replace("http://", "ws://")
    ws_url = f"{ws_url}/provider?id={provider_id}"

    extra_headers = {}
    if RELAY_SECRET:
        extra_headers["X-Relay-Token"] = RELAY_SECRET

    print(f"[relay] connecting to {ws_url[:40]}...", flush=True)

    async with websockets.connect(ws_url, additional_headers=extra_headers, ping_interval=None) as ws:
        await ws.send(json.dumps({"type": "hello", "provider_id": provider_id}))
        print(f"[relay] connected. Provider {provider_id[:12]}... registered.", flush=True)

        async for raw in ws:
            try:
                msg = json.loads(raw)
            except Exception:
                continue
            asyncio.create_task(handle_message(ws, msg))


async def run():
    if not RELAY_URL:
        print("[relay] ZKAI_RELAY_URL not set — skipping relay connection (direct mode)", flush=True)
        return

    provider_id = load_provider_id()
    backoff = 2

    while True:
        try:
            await connect(provider_id)
        except Exception as e:
            print(f"[relay] disconnected: {e}. Reconnecting in {backoff}s...", flush=True)

        await asyncio.sleep(backoff)
        backoff = min(backoff * 2, 60)


if __name__ == "__main__":
    asyncio.run(run())
