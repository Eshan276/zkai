import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

// Called by the provider CLI (zkai register) after on-chain registration succeeds.
// Upserts the provider into Neon so the gateway can discover it without the bridge.
export async function POST(req: Request) {
  const sql = getSql();
  const body = await req.json().catch(() => null);
  const { provider_id, endpoint, model, price, hardware } = body ?? {};

  if (!provider_id || !endpoint) {
    return NextResponse.json({ error: 'provider_id and endpoint required' }, { status: 400 });
  }

  const hw = hardware ? JSON.stringify(hardware) : null;

  await sql`
    INSERT INTO providers (id, endpoint, model, price, active, hardware, updated_at)
    VALUES (${provider_id}, ${endpoint}, ${model ?? ''}, ${Number(price ?? 0)}, TRUE, ${hw}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE
      SET endpoint   = EXCLUDED.endpoint,
          model      = EXCLUDED.model,
          price      = EXCLUDED.price,
          active     = TRUE,
          hardware   = COALESCE(EXCLUDED.hardware, providers.hardware),
          updated_at = NOW()
  `;

  return NextResponse.json({ ok: true });
}
