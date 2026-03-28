import { FastifyInstance } from 'fastify';
import * as contracts from '../contracts.js';

export async function attestationRoutes(app: FastifyInstance) {
  app.post('/attestation/post-attestation', async (req, reply) => {
    const { job_id, attestation_hash, model_hash } = req.body as any;
    if (!job_id || !attestation_hash || !model_hash) {
      return reply.status(400).send({ error: 'job_id, attestation_hash, model_hash required' });
    }
    const txId = await contracts.postAttestation(job_id, attestation_hash, model_hash);
    return { tx_id: txId };
  });
}
