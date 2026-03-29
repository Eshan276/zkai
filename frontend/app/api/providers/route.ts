import { NextResponse } from 'next/server';
import { fetchProviders } from '@/lib/indexer';
import { CONTRACTS } from '@/lib/contracts';

export async function GET() {
  if (!CONTRACTS.ProviderRegistry) {
    return NextResponse.json([]);
  }
  try {
    const providers = await fetchProviders(CONTRACTS.ProviderRegistry);
    return NextResponse.json(providers);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
