// POST /api/auth/challenge
// Body: { wallet_address: string }
// Returns: { nonce: string, message: string }
//
// Client signs `message` with their Midnight wallet, then POSTs to /api/auth/verify

import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { randomBytes } from 'crypto';

export async function POST(req: Request) {
  const sql = getSql();
  const { wallet_address } = await req.json();
  if (!wallet_address || typeof wallet_address !== 'string') {
    return NextResponse.json({ error: 'wallet_address required' }, { status: 400 });
  }

  const nonce = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

  await sql`
    INSERT INTO challenges (nonce, wallet_address, expires_at)
    VALUES (${nonce}, ${wallet_address}, ${expiresAt.toISOString()})
    ON CONFLICT (nonce) DO NOTHING
  `;

  const message = `Sign in to ZKai\nWallet: ${wallet_address}\nNonce: ${nonce}`;
  return NextResponse.json({ nonce, message });
}
