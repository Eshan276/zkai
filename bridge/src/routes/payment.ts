import { FastifyInstance } from 'fastify';
import * as contracts from '../contracts.js';

export async function paymentRoutes(app: FastifyInstance) {
  // Consumer deposits A0GI into escrow (amount in wei)
  app.post('/payment/deposit', async (req, reply) => {
    const { amount } = req.body as any;
    if (!amount) return reply.status(400).send({ error: 'amount required (in wei)' });
    const txId = await contracts.deposit(amount);
    return { tx_id: txId };
  });

  // Provider calls this after each inference to deduct from consumer's balance
  app.post('/payment/deduct-balance', async (req, reply) => {
    const { job_id, wallet_address, provider_id, amount } = req.body as any;
    if (!job_id || !wallet_address || !amount) {
      return reply.status(400).send({ error: 'job_id, wallet_address, amount required' });
    }
    // provider_id should be the provider's EVM address (0x...); bridge uses its own address as fallback
    const txId = await contracts.deductBalance(wallet_address, provider_id ?? '', job_id, amount);
    return { tx_id: txId };
  });

  // Consumer withdraws remaining balance (amount in wei)
  app.post('/payment/withdraw', async (req, reply) => {
    const { amount } = req.body as any;
    if (!amount) return reply.status(400).send({ error: 'amount required (in wei)' });
    const txId = await contracts.withdraw(amount);
    return { tx_id: txId };
  });

  // Read consumer's on-chain balance
  app.get('/payment/balance/:address', async (req, reply) => {
    const { address } = req.params as any;
    const { ethers } = await import('ethers');
    const { getEthersProvider } = await import('../wallet.js');
    const { ADDRESSES } = await import('../contracts.js');
    const { readFileSync, existsSync } = await import('node:fs');
    const abiPath = existsSync('/app/abis/PaymentEscrow.json')
      ? '/app/abis/PaymentEscrow.json'
      : new URL('../../../deploy/abis/PaymentEscrow.json', import.meta.url).pathname;
    const abi = JSON.parse(readFileSync(abiPath, 'utf-8'));
    const contract = new ethers.Contract(ADDRESSES.PaymentEscrow, abi, getEthersProvider());
    const bal = await contract.balance(address);
    return { address, balance_wei: bal.toString(), balance_a0gi: ethers.formatEther(bal) };
  });
}
