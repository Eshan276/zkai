import { NextResponse } from 'next/server';
import { fetchJobs } from '@/lib/indexer';
import { CONTRACTS } from '@/lib/contracts';

export async function GET() {
  if (!CONTRACTS.PaymentEscrow) {
    return NextResponse.json([]);
  }
  try {
    const jobs = await fetchJobs(CONTRACTS.PaymentEscrow);
    return NextResponse.json(jobs);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
