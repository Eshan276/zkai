'use client';

/**
 * Browser-side escrow deposit/withdraw via MetaMask + 0G chain.
 *
 * Flow:
 *  1. Get signer from MetaMask
 *  2. Call PaymentEscrow contract directly with ethers.js
 *  3. User approves tx in MetaMask
 */

import { ethers } from 'ethers';
import { CONTRACTS } from './contracts';

const PAYMENT_ESCROW_ABI = [
  { type: 'function', name: 'deposit', inputs: [], outputs: [], stateMutability: 'payable' },
  { type: 'function', name: 'withdraw', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'balance', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
];

export type EscrowAction = 'deposit' | 'withdraw';

export async function callEscrow(
  provider: ethers.BrowserProvider,
  action: EscrowAction,
  amount: bigint,
): Promise<string> {
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(CONTRACTS.PaymentEscrow, PAYMENT_ESCROW_ABI, signer);

  let tx: ethers.TransactionResponse;
  if (action === 'deposit') {
    tx = await contract.deposit({ value: amount });
  } else {
    tx = await contract.withdraw(amount);
  }

  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

export async function getEscrowBalance(
  provider: ethers.BrowserProvider,
  address: string,
): Promise<bigint> {
  const contract = new ethers.Contract(CONTRACTS.PaymentEscrow, PAYMENT_ESCROW_ABI, provider);
  return contract.balance(address);
}
