import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

/** Row shape from `jobs` SELECT (same columns as `cols` below). */
type JobDbRow = {
  job_id: string;
  provider_id: string;
  amount: number;
  model: string;
  attestation_hash: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  duration_ms: number | null;
  cpu_percent: number | null;
  ram_mb: number | null;
  created_at: Date | string | null;
};

export async function GET(req: Request) {
  const sql = getSql();
  const wallet = new URL(req.url).searchParams.get('wallet');

  const cols = `job_id, provider_id, amount, model, created_at, attestation_hash,
    prompt_tokens, completion_tokens, duration_ms, cpu_percent, ram_mb`;

  const mapRow = (r: JobDbRow) => ({
    id: r.job_id,
    provider_id: r.provider_id,
    amount: r.amount,
    model: r.model,
    status: 1,
    attestation_hash: r.attestation_hash ?? '',
    prompt_tokens: r.prompt_tokens ?? null,
    completion_tokens: r.completion_tokens ?? null,
    duration_ms: r.duration_ms ?? null,
    cpu_percent: r.cpu_percent ?? null,
    ram_mb: r.ram_mb ?? null,
    created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
  });

  const providerId = new URL(req.url).searchParams.get('provider_id');

  try {
    if (providerId) {
      const rows = await sql`
        SELECT ${sql.unsafe(cols)}
        FROM jobs
        WHERE provider_id = ${providerId}
        ORDER BY created_at DESC
        LIMIT 200
      `;
      return NextResponse.json((rows as JobDbRow[]).map(mapRow));
    }

    if (!wallet) {
      const rows = await sql`
        SELECT ${sql.unsafe(cols)}, wallet_address
        FROM jobs ORDER BY created_at DESC LIMIT 20
      `;
      return NextResponse.json((rows as JobDbRow[]).map(mapRow));
    }

    const rows = await sql`
      SELECT ${sql.unsafe(cols)}
      FROM jobs
      WHERE wallet_address = ${wallet}
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return NextResponse.json((rows as JobDbRow[]).map(mapRow));
  } catch {
    return NextResponse.json([]);
  }
}
