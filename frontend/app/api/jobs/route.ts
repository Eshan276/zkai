import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: Request) {
  const wallet = new URL(req.url).searchParams.get('wallet');

  const cols = `job_id, provider_id, amount, model, created_at,
    prompt_tokens, completion_tokens, duration_ms, cpu_percent, ram_mb`;

  const mapRow = (r: any) => ({
    id: r.job_id,
    provider_id: r.provider_id,
    amount: r.amount,
    model: r.model,
    status: 1,
    attestation_hash: '',
    prompt_tokens: r.prompt_tokens ?? null,
    completion_tokens: r.completion_tokens ?? null,
    duration_ms: r.duration_ms ?? null,
    cpu_percent: r.cpu_percent ?? null,
    ram_mb: r.ram_mb ?? null,
  });

  try {
    if (!wallet) {
      const rows = await sql`
        SELECT ${sql.unsafe(cols)}, wallet_address
        FROM jobs ORDER BY created_at DESC LIMIT 20
      `;
      return NextResponse.json(rows.map(mapRow));
    }

    const rows = await sql`
      SELECT ${sql.unsafe(cols)}
      FROM jobs
      WHERE wallet_address = ${wallet}
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return NextResponse.json(rows.map(mapRow));
  } catch {
    return NextResponse.json([]);
  }
}
