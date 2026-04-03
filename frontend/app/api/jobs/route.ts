import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Return recent jobs for the authenticated wallet (from DB, populated by gateway on inference)
export async function GET(req: Request) {
  const wallet = new URL(req.url).searchParams.get('wallet');
  if (!wallet) return NextResponse.json([]);

  try {
    const rows = await sql`
      SELECT job_id, provider_id, amount, created_at
      FROM jobs
      WHERE wallet_address = ${wallet}
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return NextResponse.json(rows.map(r => ({
      id: r.job_id,
      provider_id: r.provider_id,
      amount: r.amount,
      status: 1,
      attestation_hash: '',
    })));
  } catch {
    return NextResponse.json([]);
  }
}
