'use client';

/**
 * Browser-side escrow deposit/withdraw via Lace wallet.
 *
 * Flow:
 *  1. Get coin/enc public keys from Lace
 *  2. POST to /api/escrow/build-tx — server builds + proves the tx (Node.js only code)
 *  3. connectedAPI.balanceUnsealedTransaction(txHex) — Lace adds inputs, user approves
 *  4. connectedAPI.submitTransaction(balanced.tx) — submitted from user's wallet
 */

import type { ConnectedAPI, KeyMaterialProvider } from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';

// ZK artifacts served from /public/zk/PaymentEscrow/
const ZK_BASE_URL = (): string =>
  typeof window !== 'undefined'
    ? `${window.location.origin}/zk/PaymentEscrow`
    : 'http://localhost:3000/zk/PaymentEscrow';

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

  // Step 2: Server builds + proves the unbound tx
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
