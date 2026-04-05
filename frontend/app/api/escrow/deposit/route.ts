import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

const BRIDGE_URL = (process.env.ZKAI_BRIDGE_URL ?? 'http://localhost:7300').replace(/\/$/, '');

export async function POST(req: Request) {
  const sql = getSql();
  // Verify API key
  const apiKey = req.headers.get('x-api-key') ?? req.headers.get('authorization')?.replace(/^Bearer /, '');
  let walletAddress: string | null = null;

  if (apiKey) {
    const rows = await sql`SELECT wallet_address FROM api_keys WHERE key = ${apiKey} AND revoked = FALSE`;
    walletAddress = rows[0]?.wallet_address ?? null;
  }

  const { amount } = await req.json();
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  try {
    const res = await fetch(`${BRIDGE_URL}/payment/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: String(Math.floor(Number(amount))) }),
      // @ts-ignore
      signal: AbortSignal.timeout(120_000),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.error ?? 'Bridge error' }, { status: res.status });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
