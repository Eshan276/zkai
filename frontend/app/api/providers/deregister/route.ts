import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function POST(req: Request) {
  const sql = getSql();
  const body = await req.json().catch(() => null);
  const { provider_id } = body ?? {};

  if (!provider_id) {
    return NextResponse.json({ error: 'provider_id required' }, { status: 400 });
  }

  await sql`
    UPDATE providers SET active = FALSE, updated_at = NOW()
    WHERE id = ${provider_id}
  `;

  return NextResponse.json({ ok: true });
}
