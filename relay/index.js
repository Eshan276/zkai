/**
 * ZKai Relay — Fly.io WebSocket relay server
 *
 * Providers connect here via WS (outbound, no public IP needed).
 * Gateway POSTs inference requests here via HTTP.
 * Relay bridges them using in-memory correlation IDs.
 */

const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3001;
const RELAY_SECRET = process.env.RELAY_SECRET || '';
const REQUEST_TIMEOUT_MS = 115_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 10_000;

// provider_id → WebSocket
const providers = new Map();

// correlation_id → { resolve, reject, timer }
const pending = new Map();

// ── HTTP server ──────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost`);

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', providers: providers.size }));
    return;
  }

  // POST /relay/:provider_id — gateway sends inference request here
  const relayMatch = url.pathname.match(/^\/relay\/([a-f0-9]+)$/);
  if (req.method === 'POST' && relayMatch) {
    const providerId = relayMatch[1];
    handleRelayRequest(req, res, providerId);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

function handleRelayRequest(req, res, providerId) {
  const ws = providers.get(providerId);
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'provider_offline', provider_id: providerId }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let parsed;
    try { parsed = JSON.parse(body); } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid json' }));
      return;
    }

    const correlationId = uuidv4();

    // Forward auth headers from gateway to provider
    const forwardHeaders = {};
    const passthrough = ['x-api-key', 'x-wallet-address', 'x-coin-public-key', 'content-type'];
    for (const h of passthrough) {
      if (req.headers[h]) forwardHeaders[h] = req.headers[h];
    }

    const timer = setTimeout(() => {
      const entry = pending.get(correlationId);
      if (entry) {
        pending.delete(correlationId);
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'provider_timeout' }));
      }
    }, REQUEST_TIMEOUT_MS);

    pending.set(correlationId, {
      resolve: (status, responseBody) => {
        clearTimeout(timer);
        pending.delete(correlationId);
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody));
      },
      reject: (statusCode, message) => {
        clearTimeout(timer);
        pending.delete(correlationId);
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: message }));
      },
    });

    ws.send(JSON.stringify({
      type: 'request',
      correlation_id: correlationId,
      headers: forwardHeaders,
      body: parsed,
    }));
  });
}

// ── WebSocket server ─────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server, path: '/provider' });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const providerId = url.searchParams.get('id');

  // Auth check
  const token = req.headers['x-relay-token'];
  if (RELAY_SECRET && token !== RELAY_SECRET) {
    ws.close(4401, 'unauthorized');
    return;
  }

  if (!providerId) {
    ws.close(4400, 'missing provider id');
    return;
  }

  // Evict old connection if provider reconnects
  const old = providers.get(providerId);
  if (old && old.readyState === WebSocket.OPEN) {
    old.close(1001, 'replaced by new connection');
  }

  providers.set(providerId, ws);
  console.log(`[relay] provider connected: ${providerId.slice(0, 12)}... (total: ${providers.size})`);

  // Heartbeat
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }

    if (msg.type === 'pong') {
      ws.isAlive = true;
      return;
    }

    if (msg.type === 'response') {
      const entry = pending.get(msg.correlation_id);
      if (entry) {
        entry.resolve(msg.status ?? 200, msg.body);
      }
      return;
    }

    if (msg.type === 'hello') {
      // Re-register in case id in query param differed
      if (msg.provider_id && msg.provider_id !== providerId) {
        providers.delete(providerId);
        providers.set(msg.provider_id, ws);
      }
    }
  });

  ws.on('close', () => {
    if (providers.get(providerId) === ws) {
      providers.delete(providerId);
    }
    console.log(`[relay] provider disconnected: ${providerId.slice(0, 12)}... (total: ${providers.size})`);

    // Reject all pending requests for this provider
    for (const [corrId, entry] of pending.entries()) {
      // We can't know which pending requests belong to this provider without storing that,
      // so we leave them to timeout. Requests in flight get a 504 after 115s.
      // For immediate rejection on disconnect, providers map would need to track correlation IDs.
    }
  });

  ws.on('error', (err) => {
    console.error(`[relay] provider ws error (${providerId.slice(0, 12)}...):`, err.message);
  });
});

// Heartbeat loop — terminate stale connections
const heartbeatInterval = setInterval(() => {
  for (const [providerId, ws] of providers.entries()) {
    if (!ws.isAlive) {
      console.log(`[relay] terminating stale connection: ${providerId.slice(0, 12)}...`);
      providers.delete(providerId);
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
    // Also send JSON ping for clients that don't handle WS-level pings
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }
}, HEARTBEAT_INTERVAL_MS);

server.on('close', () => clearInterval(heartbeatInterval));

// ── Start ────────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`[relay] listening on port ${PORT}`);
  console.log(`[relay] auth: ${RELAY_SECRET ? 'enabled' : 'DISABLED (set RELAY_SECRET)'}`);
});

process.on('SIGTERM', () => {
  console.log('[relay] shutting down...');
  server.close();
  process.exit(0);
});
