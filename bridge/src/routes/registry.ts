import { FastifyInstance } from 'fastify';
import * as contracts from '../contracts.js';

export async function registryRoutes(app: FastifyInstance) {
  app.post('/registry/register-provider', async (req, reply) => {
    const { provider_id, pubkey, endpoint, model, price } = req.body as any;
    if (!provider_id || !pubkey || !endpoint || !model || !price) {
      return reply.status(400).send({ error: 'provider_id, pubkey, endpoint, model, price required' });
    }
    try {
      const txId = await contracts.registerProvider(provider_id, pubkey, endpoint, model, price);
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
    const txId = await contracts.deregisterProvider(provider_id);
    return { tx_id: txId };
  });
}
