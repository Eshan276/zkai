import { FastifyInstance } from 'fastify';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as contracts from '../contracts.js';

// Local provider cache — persisted to disk so it survives bridge restarts
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
    if (!provider_id || !pubkey || !endpoint || !model || !price) {
      return reply.status(400).send({ error: 'provider_id, pubkey, endpoint, model, price required' });
    }
    try {
      const txId = await contracts.registerProvider(provider_id, pubkey, endpoint, model, price);

      // Persist provider locally for fast reads
      const providers = loadProviders();
      const existing = providers.findIndex(p => p.id === provider_id);
      const record: ProviderRecord = {
        id: provider_id,
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
      console.log(`[registry] provider ${provider_id.slice(0, 8)}... saved to ${PROVIDERS_FILE}`);

      return { tx_id: txId };
    } catch (e: any) {
      console.error('[registry] registerProvider error:', e?.message ?? e);
      return reply.status(500).send({ error: e?.message ?? String(e) });
    }
  });

  app.post('/registry/deregister-provider', async (req, reply) => {
    const { provider_id } = req.body as any;
    if (!provider_id) {
      return reply.status(400).send({ error: 'provider_id required' });
    }
    try {
      const txId = await contracts.deregisterProvider(provider_id);

      // Mark inactive locally
      const providers = loadProviders();
      const existing = providers.find(p => p.id === provider_id);
      if (existing) { existing.active = false; saveProviders(providers); }

      return { tx_id: txId };
    } catch (e: any) {
      console.error('[registry] deregisterProvider error:', e?.message ?? e);
      return reply.status(500).send({ error: e?.message ?? String(e) });
    }
  });
}
