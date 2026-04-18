/**
 * ZKai Bridge Server — HTTP bridge between enclave and 0G chain EVM contracts.
 * Start: ZKAI_PRIVATE_KEY=<hex> npm start
 * Default port: 7300
 */

import Fastify from 'fastify';
import { startWallet, isWalletReady, getProviderAddress } from './wallet.js';
import { paymentRoutes } from './routes/payment.js';
import { registryRoutes } from './routes/registry.js';
import { attestationRoutes } from './routes/attestation.js';

const PORT = parseInt(process.env.BRIDGE_PORT ?? '7300', 10);

const app = Fastify({ logger: false });

app.get('/health', async () => {
  if (!isWalletReady()) {
    return { status: 'ok', synced: false, note: 'wallet initializing' };
  }
  return {
    status: 'ok',
    synced: true,
    address: getProviderAddress(),
    chain: '0G Galileo',
  };
});

await app.register(paymentRoutes);
await app.register(registryRoutes);
await app.register(attestationRoutes);

app.setErrorHandler((err, _req, reply) => {
  console.error('Bridge error:', err.message);
  reply.status(500).send({ error: err.message });
});

console.log('╔══════════════════════════════════════════╗');
console.log('║       ZKai Bridge Server (0G Chain)      ║');
console.log('╚══════════════════════════════════════════╝\n');

// Initialize wallet before starting server (instant — no sync wait)
try {
  await startWallet();
} catch (e: any) {
  console.error('Wallet init failed:', e?.message ?? e);
  console.error('Set ZKAI_PRIVATE_KEY env var and restart.');
  process.exit(1);
}

await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`\nBridge running at http://127.0.0.1:${PORT}`);
console.log('All contract routes active.\n');
