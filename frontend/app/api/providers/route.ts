import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function GET() {
  const sql = getSql();
  try {
    const rows = await sql`
      SELECT
        p.id,
        p.endpoint,
        p.model,
        p.price,
        p.reputation,
        p.hardware,
        AVG(j.duration_ms)::float  AS avg_latency_ms,
        COUNT(j.job_id)::int       AS total_jobs
      FROM providers p
      LEFT JOIN jobs j
        ON j.provider_id = p.id
        AND j.duration_ms IS NOT NULL
        AND j.attestation_hash IS NOT NULL
      WHERE p.active = TRUE
      GROUP BY p.id, p.endpoint, p.model, p.price, p.reputation, p.hardware
      ORDER BY p.reputation DESC
    `;
    return NextResponse.json(
      rows.map((r: Record<string, unknown>) => ({
        ...r,
        avg_latency_ms: r.avg_latency_ms != null ? Math.round(r.avg_latency_ms as number) : null,
      })),
    );
  } catch {
    return NextResponse.json([]);
  }
}
