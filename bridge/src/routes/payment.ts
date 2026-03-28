import { FastifyInstance } from 'fastify';
import * as contracts from '../contracts.js';

export async function paymentRoutes(app: FastifyInstance) {
  app.post('/payment/create-job', async (req, reply) => {
    const { job_id, provider_id, amount } = req.body as any;
    if (!job_id || !provider_id || !amount) {
      return reply.status(400).send({ error: 'job_id, provider_id, amount required' });
    }
    const txId = await contracts.createJob(job_id, provider_id, amount);
    return { tx_id: txId, job_id };
  });

  app.post('/payment/complete-job', async (req, reply) => {
    const { job_id, attestation_hash } = req.body as any;
    if (!job_id || !attestation_hash) {
      return reply.status(400).send({ error: 'job_id, attestation_hash required' });
    }
    const txId = await contracts.completeJob(job_id, attestation_hash);
    return { tx_id: txId };
  });

  app.post('/payment/dispute-job', async (req, reply) => {
    const { job_id } = req.body as any;
    if (!job_id) {
      return reply.status(400).send({ error: 'job_id required' });
    }
    const txId = await contracts.disputeJob(job_id);
    return { tx_id: txId };
  });
}
