// GET /api/auth/verify-key?key=zkai-xxx
// Called by provider enclaves to validate an API key before inference.
// Returns: { valid: bool, wallet_address?: string }
//
// Enclaves should cache the result for 60s to avoid hammering this endpoint.

import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function GET(req: Request) {
  const sql = getSql();
  const key = new URL(req.url).searchParams.get('key');
  if (!key) {
    return NextResponse.json({ valid: false, error: 'key required' }, { status: 400 });
  }

  const rows = await sql`
    SELECT ak.wallet_address, u.coin_public_key
    FROM api_keys ak
    JOIN users u ON u.wallet_address = ak.wallet_address
    WHERE ak.key = ${key} AND ak.revoked = FALSE
  `;

  if (rows.length === 0) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    wallet_address: rows[0].wallet_address,
    coin_public_key: rows[0].coin_public_key ?? null,
  });
}
