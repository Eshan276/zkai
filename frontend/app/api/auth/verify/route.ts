// POST /api/auth/verify
// Body: { wallet_address, nonce, coin_public_key, label }
// Returns: { api_key: string }
//
// Verifies the nonce exists + not expired, then issues an API key.
// Signature verification is intentionally lightweight for now —
// the wallet address itself is the identity (Midnight doesn't have
// standard secp256k1 signing exposed in the browser API yet).
// When Midnight exposes signData properly we'll add full sig verification.

import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { randomBytes } from 'crypto';

export async function POST(req: Request) {
  const sql = getSql();
  const { wallet_address, nonce, coin_public_key, label } = await req.json();
  const normalizedLabel = typeof label === 'string' ? label.trim() : '';

  if (!wallet_address || !nonce) {
    return NextResponse.json({ error: 'wallet_address and nonce required' }, { status: 400 });
  }
  if (!normalizedLabel) {
    return NextResponse.json({ error: 'label required' }, { status: 400 });
  }
  if (normalizedLabel.length > 80) {
    return NextResponse.json({ error: 'label must be 80 characters or less' }, { status: 400 });
  }

  // Verify nonce exists, matches wallet, and hasn't expired
  const rows = await sql`
    SELECT * FROM challenges
    WHERE nonce = ${nonce}
      AND wallet_address = ${wallet_address}
      AND expires_at > NOW()
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 401 });
  }

  // Consume the nonce (one-time use)
  await sql`DELETE FROM challenges WHERE nonce = ${nonce}`;

  // Upsert user — store coinPublicKey for escrow deduction lookups
  await sql`
    INSERT INTO users (wallet_address, coin_public_key) VALUES (${wallet_address}, ${coin_public_key ?? null})
    ON CONFLICT (wallet_address) DO UPDATE SET coin_public_key = EXCLUDED.coin_public_key
  `;

  // Issue API key
  const api_key = `zkai-${randomBytes(24).toString('hex')}`;

  await sql`
    INSERT INTO api_keys (key, wallet_address, label)
    VALUES (${api_key}, ${wallet_address}, ${normalizedLabel})
  `;

  return NextResponse.json({ api_key, wallet_address, label: normalizedLabel });
}
