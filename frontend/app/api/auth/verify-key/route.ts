// GET /api/auth/verify-key?key=zkai-xxx
// Called by provider enclaves to validate an API key before inference.
// Returns: { valid: bool, wallet_address?: string }
//
// Enclaves should cache the result for 60s to avoid hammering this endpoint.

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get('key');
  if (!key) {
    return NextResponse.json({ valid: false, error: 'key required' }, { status: 400 });
  }

  const rows = await sql`
    SELECT wallet_address FROM api_keys
    WHERE key = ${key} AND revoked = FALSE
  `;

  if (rows.length === 0) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({ valid: true, wallet_address: rows[0].wallet_address });
}
