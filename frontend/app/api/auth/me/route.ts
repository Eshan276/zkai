// GET /api/auth/me?wallet=mn_addr_preprod1...
// Returns all API keys for a wallet address (for dashboard display)

import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function GET(req: Request) {
  const sql = getSql();
  const wallet = new URL(req.url).searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 });
  }

  const keys = await sql`
    SELECT key, created_at, revoked, label
    FROM api_keys
    WHERE wallet_address = ${wallet}
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ keys });
}

// DELETE /api/auth/me — revoke a key
export async function DELETE(req: Request) {
  const sql = getSql();
  const { key, wallet_address } = await req.json();
  if (!key || !wallet_address) {
    return NextResponse.json({ error: 'key and wallet_address required' }, { status: 400 });
  }

  await sql`
    UPDATE api_keys SET revoked = TRUE
    WHERE key = ${key} AND wallet_address = ${wallet_address}
  `;

  return NextResponse.json({ ok: true });
}
