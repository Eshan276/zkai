#!/bin/bash
# Start Ollama in background, pull model, then start FastAPI

# Start Ollama server
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready
echo "[start] Waiting for Ollama..."
until curl -s http://localhost:11434/api/tags > /dev/null; do
    sleep 1
done
echo "[start] Ollama ready."

# Pull model if not already present
MODEL=${OLLAMA_MODEL:-"qwen2.5:1.5b"}
echo "[start] Pulling model: $MODEL"
ollama pull $MODEL
echo "[start] Model ready."

# Start FastAPI enclave API in background, then launch relay client
python3 api/main.py &
FASTAPI_PID=$!

# Wait for enclave to be healthy before connecting to relay
echo "[start] Waiting for enclave API..."
until curl -sf http://localhost:8080/health > /dev/null; do
    sleep 2
done
echo "[start] Enclave ready."

# Connect to relay (outbound WS — no public URL needed)
if [ -n "$ZKAI_RELAY_URL" ]; then
    echo "[start] Connecting to relay at $ZKAI_RELAY_URL..."
    python3 /app/api/ws_relay_client.py &
fi

# Keep container alive by waiting on FastAPI
wait $FASTAPI_PID
