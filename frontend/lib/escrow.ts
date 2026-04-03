'use client';

/**
 * Browser-side escrow deposit/withdraw via Lace wallet.
 *
 * Flow:
 *  1. Get coin/enc public keys from Lace
 *  2. POST to /api/escrow/build-tx — server builds + proves the tx via centralized proof server (VPC)
 *  3. connectedAPI.balanceUnsealedTransaction(txHex) — Lace adds inputs, user approves
 *  4. connectedAPI.submitTransaction(balanced.tx) — submitted from user's wallet
 */

import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

export type EscrowAction = 'deposit' | 'withdraw';

export async function callEscrow(
  connectedAPI: ConnectedAPI,
  action: EscrowAction,
  amount: bigint,
): Promise<void> {
  // Step 1: Get keys from Lace
  const shieldedRaw = await connectedAPI.getShieldedAddresses();
  const coinPublicKey: string = (shieldedRaw as any).shieldedCoinPublicKey;
  const encPublicKey: string = (shieldedRaw as any).shieldedEncryptionPublicKey;

  // Step 2: Server builds + proves the tx (proof server in VPC)
  const res = await fetch('/api/escrow/build-tx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, amount: amount.toString(), coinPublicKey, encPublicKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to build transaction');

  const txHex: string = data.tx;

  // Step 3: Lace balances the tx — user approves in Lace UI
  const { tx: balancedTx } = await connectedAPI.balanceUnsealedTransaction(txHex);

  // Step 4: Submit from user's wallet
  await connectedAPI.submitTransaction(balancedTx);
}
