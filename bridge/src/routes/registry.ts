import { FastifyInstance } from 'fastify';
import * as fs from 'node:fs';
import * as contracts from '../contracts.js';
import { getProviderAddress } from '../wallet.js';

const AUTH_URL = (process.env.ZKAI_AUTH_URL ?? '').replace(/\/$/, '');
const PROVIDERS_FILE = process.env.PROVIDERS_FILE ?? '/app/providers.json';

interface ProviderRecord {
  id: string;
  endpoint: string;
  model: string;
  price: number;
  reputation: number;
  active: boolean;
  registered_at: string;
}

function loadProviders(): ProviderRecord[] {
  try {
    if (fs.existsSync(PROVIDERS_FILE)) {
      return JSON.parse(fs.readFileSync(PROVIDERS_FILE, 'utf-8'));
    }
  } catch {}
  return [];
}

function saveProviders(providers: ProviderRecord[]) {
  fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(providers, null, 2));
}

export async function registryRoutes(app: FastifyInstance) {
  app.get('/providers', async () => {
    return loadProviders().filter(p => p.active);
  });

  app.post('/registry/register-provider', async (req, reply) => {
    const { provider_id, pubkey, endpoint, model, price } = req.body as any;
    if (!endpoint || !model || !price) {
      return reply.status(400).send({ error: 'endpoint, model, price required' });
    }
    try {
      // On 0G chain, the bridge wallet address IS the provider ID (msg.sender)
      const evmProviderId = getProviderAddress();
      const txId = await contracts.registerProvider(provider_id ?? evmProviderId, pubkey ?? '', endpoint, model, price);

      const providers = loadProviders();
      const existing = providers.findIndex(p => p.id === evmProviderId);
      const record: ProviderRecord = {
        id: evmProviderId,
        endpoint,
        model,
        price: Number(price),
        reputation: 0.5,
        active: true,
        registered_at: new Date().toISOString(),
      };
      if (existing >= 0) providers[existing] = record;
      else providers.push(record);
      saveProviders(providers);
      console.log(`[registry] provider ${evmProviderId} saved`);

      if (AUTH_URL) {
        fetch(`${AUTH_URL}/api/providers/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider_id: evmProviderId, endpoint, model, price }),
        }).then(r => console.log(`[registry] central DB sync: ${r.status}`))
          .catch(e => console.warn(`[registry] central DB sync failed: ${e.message}`));
      }

      return { tx_id: txId, provider_id: evmProviderId };
    } catch (e: any) {
      console.error('[registry] registerProvider error:', e?.message ?? e);
      return reply.status(500).send({ error: e?.message ?? String(e) });
    }
  });

  app.post('/registry/deregister-provider', async (req, reply) => {
    const { provider_id } = req.body as any;
    try {
      const txId = await contracts.deregisterProvider(provider_id ?? '');

      const evmProviderId = getProviderAddress();
      const providers = loadProviders();
      const existing = providers.find(p => p.id === evmProviderId);
      if (existing) { existing.active = false; saveProviders(providers); }

      if (AUTH_URL) {
        fetch(`${AUTH_URL}/api/providers/deregister`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider_id: evmProviderId }),
        }).catch(() => {});
      }

      return { tx_id: txId };
    } catch (e: any) {
      console.error('[registry] deregisterProvider error:', e?.message ?? e);
      return reply.status(500).send({ error: e?.message ?? String(e) });
    }
  });
}
