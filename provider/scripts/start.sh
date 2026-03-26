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

# Start FastAPI enclave API
python3 api/main.py
