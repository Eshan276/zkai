import { NextResponse } from 'next/server';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { encodeCoinPublicKey } from '@midnight-ntwrk/ledger-v8';
import { ledger } from '@/lib/compiled/PaymentEscrow/contract';

const INDEXER_HTTP = 'https://indexer.preprod.midnight.network/api/v3/graphql';
const INDEXER_WS = 'wss://indexer.preprod.midnight.network/api/v3/graphql/ws';
const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const coinPublicKey = searchParams.get('coinPublicKey');
  if (!coinPublicKey) {
    return NextResponse.json({ error: 'coinPublicKey required' }, { status: 400 });
  }

  try {
    const publicDataProvider = indexerPublicDataProvider(INDEXER_HTTP, INDEXER_WS);
    const contractState = await publicDataProvider.queryContractState(ESCROW_ADDRESS as any);
    if (!contractState) {
      return NextResponse.json({ balance: '0' });
    }

    const state = ledger(contractState.data);
    const keyBytes = encodeCoinPublicKey(coinPublicKey);
    const balance = state.balance.member(keyBytes) ? state.balance.lookup(keyBytes) : 0n;

    return NextResponse.json({ balance: balance.toString() });
  } catch (e: any) {
    console.error('[escrow/balance] error:', e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? 'Failed to fetch balance' }, { status: 500 });
  }
}
