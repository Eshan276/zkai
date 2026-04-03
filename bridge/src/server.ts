/**
 * ZKai Bridge Server — Node.js HTTP bridge between Python SDK and Midnight contracts.
 * Runs as a sidecar process alongside the Python SDK.
 *
 * Start: npm start  (or: ZKAI_SEED=<hex> npm start)
 * Default port: 7300
 */

import Fastify from 'fastify';
import { startWallet, getWalletContext, isWalletReady } from './wallet.js';
import { paymentRoutes } from './routes/payment.js';
import { registryRoutes } from './routes/registry.js';
import { attestationRoutes } from './routes/attestation.js';

const PORT = parseInt(process.env.BRIDGE_PORT ?? '7300', 10);

const app = Fastify({ logger: false });

// Health check — returns immediately without blocking on wallet sync
app.get('/health', async () => {
  if (!isWalletReady()) {
    return { status: 'ok', synced: false, note: 'wallet syncing' };
  }
  try {
    const ctx = await getWalletContext();
    return {
      status: 'ok',
      synced: true,
      address: ctx.unshieldedKeystore.getBech32Address().toString(),
    };
  } catch {
    return { status: 'ok', synced: false };
  }
});

// Register routes
await app.register(paymentRoutes);
await app.register(registryRoutes);
await app.register(attestationRoutes);

// Error handler
app.setErrorHandler((err, _req, reply) => {
  console.error('Bridge error:', err.message);
  reply.status(500).send({ error: err.message });
});

console.log('╔══════════════════════════════════════════╗');
console.log('║       ZKai Bridge Server                 ║');
console.log('╚══════════════════════════════════════════╝\n');

// Start HTTP server immediately — don't wait for wallet sync
await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`\nBridge running at http://127.0.0.1:${PORT}`);
console.log('Wallet syncing in background...\n');

// Wallet sync happens in background — routes that need it will wait
startWallet().then(() => {
  console.log('Wallet ready. All contract routes active.');
}).catch((e) => {
  console.error('Wallet startup failed:', e?.message ?? e);
  console.error('Contract routes will be unavailable until restart.');
});
