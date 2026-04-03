/**
 * Server-side API route: builds and proves an escrow deposit/withdraw transaction.
 *
 * Browser sends:
 *   { action: 'deposit' | 'withdraw', amount: string, coinPublicKey: string, encPublicKey: string }
 *
 * Returns:
 *   { tx: string }  — hex-encoded UnboundTransaction (proved, not yet balanced/signed)
 *
 * Browser then calls:
 *   connectedAPI.balanceUnsealedTransaction(tx)  → balanced tx hex
 *   connectedAPI.submitTransaction(balanced.tx)
 *
 * Proving is done server-side via a centralized proof server running in the VPC
 * (set PROOF_SERVER_URL env var — accessible from Vercel via private networking).
 */

import { NextResponse } from 'next/server';
import path from 'path';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import * as PaymentEscrowContract from '@/lib/compiled/PaymentEscrow/contract';
import { createUnprovenCallTxFromInitialStates } from '@midnight-ntwrk/midnight-js-contracts';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

const NETWORK_ID = 'preprod';
const INDEXER_HTTP = 'https://indexer.preprod.midnight.network/api/v3/graphql';
const INDEXER_WS = 'wss://indexer.preprod.midnight.network/api/v3/graphql/ws';
const PROOF_SERVER_URL = process.env.PROOF_SERVER_URL ?? 'http://localhost:6300';
const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT!;

const COMPILED_DIR = path.resolve(process.cwd(), 'lib', 'compiled');

function loadCompiledContract() {
  return CompiledContract.make('paymentescrow', PaymentEscrowContract.Contract).pipe(
    CompiledContract.withVacantWitnesses,
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.action || !body?.amount || !body?.coinPublicKey || !body?.encPublicKey) {
    return NextResponse.json({ error: 'action, amount, coinPublicKey, encPublicKey required' }, { status: 400 });
  }

  const { action, amount, coinPublicKey, encPublicKey } = body as {
    action: 'deposit' | 'withdraw';
    amount: string;
    coinPublicKey: string;  // bech32 string from Lace getShieldedAddresses()
    encPublicKey: string;   // bech32 string from Lace getShieldedAddresses()
  };

  if (!['deposit', 'withdraw'].includes(action)) {
    return NextResponse.json({ error: 'action must be deposit or withdraw' }, { status: 400 });
  }

  const amountBig = BigInt(Math.floor(Number(amount)));
  if (amountBig <= 0n) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  try {
    setNetworkId(NETWORK_ID);

    const compiledContract = loadCompiledContract();
    const zkConfigProvider = new NodeZkConfigProvider(path.join(COMPILED_DIR, 'PaymentEscrow'));
    const publicDataProvider = indexerPublicDataProvider(INDEXER_HTTP, INDEXER_WS);
    const proofProvider = httpClientProofProvider(PROOF_SERVER_URL, zkConfigProvider);

    // Fetch current contract + zswap state from indexer
    const states = await publicDataProvider.queryZSwapAndContractState(ESCROW_ADDRESS as any);
    if (!states) {
      return NextResponse.json({ error: 'Contract not found on-chain' }, { status: 404 });
    }
    const [initialZswapChainState, initialContractState, ledgerParameters] = states;

    // Build the unproven call tx
    const callTxData = await createUnprovenCallTxFromInitialStates(
      zkConfigProvider as any,
      {
        compiledContract: compiledContract as any,
        circuitId: action,
        contractAddress: ESCROW_ADDRESS as any,
        args: [amountBig] as any,
        coinPublicKey,
        initialContractState,
        initialZswapChainState,
        ledgerParameters,
      },
      encPublicKey,
    );

    // Prove via centralized proof server in VPC
    const unboundTx = await proofProvider.proveTx(callTxData.private.unprovenTx);

    const txHex = Buffer.from(unboundTx.serialize()).toString('hex');
    return NextResponse.json({ tx: txHex });

  } catch (e: any) {
    console.error('[build-tx] error:', e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? 'Failed to build transaction' }, { status: 500 });
  }
}
