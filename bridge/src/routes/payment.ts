import { FastifyInstance } from 'fastify';
import * as contracts from '../contracts.js';

export async function paymentRoutes(app: FastifyInstance) {
  // Consumer deposits DUST into escrow from dashboard
  app.post('/payment/deposit', async (req, reply) => {
    const { amount } = req.body as any;
    if (!amount) return reply.status(400).send({ error: 'amount required' });
    const txId = await contracts.deposit(amount);
    return { tx_id: txId };
  });

  // Provider calls this after each inference to deduct from consumer's balance
  app.post('/payment/deduct-balance', async (req, reply) => {
    const { job_id, wallet_address, amount } = req.body as any;
    if (!job_id || !wallet_address || !amount) {
      return reply.status(400).send({ error: 'job_id, wallet_address, amount required' });
    }
    const txId = await contracts.deductBalance(wallet_address, job_id, amount);
    return { tx_id: txId };
  });

  // Consumer withdraws remaining balance
  app.post('/payment/withdraw', async (req, reply) => {
    const { amount } = req.body as any;
    if (!amount) return reply.status(400).send({ error: 'amount required' });
    const txId = await contracts.withdraw(amount);
    return { tx_id: txId };
  });
}
