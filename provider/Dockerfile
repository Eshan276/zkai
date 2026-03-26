FROM ollama/ollama:latest

# Install Python for the enclave API
RUN apt-get update && apt-get install -y \
    python3 python3-pip curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY api/requirements.txt .
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

COPY api/ ./api/
COPY llama.manifest.template ./

EXPOSE 8080 11434

COPY scripts/start.sh ./start.sh
RUN chmod +x ./start.sh

ENTRYPOINT ["/bin/bash", "./start.sh"]
