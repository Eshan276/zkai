/**
 * ZKai Gateway — POST /api/v1/chat/completions
 *
 * OpenAI-compatible endpoint. Consumers send requests here;
 * we verify their API key, pick a provider, and proxy to the enclave.
 */

import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

interface Provider {
  id: string;
  endpoint: string;
  model: string;
  price: number;
  reputation: number;
  active: boolean;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

async function verifyKey(key: string): Promise<{ walletAddress: string; coinPublicKey: string | null } | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT ak.wallet_address, u.coin_public_key
    FROM api_keys ak
    JOIN users u ON u.wallet_address = ak.wallet_address
    WHERE ak.key = ${key} AND ak.revoked = FALSE
  `;
  if (rows.length === 0) return null;
  return { walletAddress: rows[0].wallet_address, coinPublicKey: rows[0].coin_public_key ?? null };
}

// ── Provider selection ────────────────────────────────────────────────────────

async function getProviders(): Promise<Provider[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, endpoint, model, price, reputation
    FROM providers
    WHERE active = TRUE
    ORDER BY reputation DESC
  `;
  return rows as Provider[];
}

function pickProvider(providers: Provider[], model: string): Provider | null {
  const candidates = providers; // already filtered by active=TRUE in SQL
  if (candidates.length === 0) return null;

  // Prefer model match, then sort by reputation desc
  const matching = candidates.filter(p =>
    model ? p.model.toLowerCase().includes(model.toLowerCase()) : true
  );
  const pool = matching.length > 0 ? matching : candidates;
  return pool.sort((a, b) => b.reputation - a.reputation)[0];
}

// ── Gateway handler ───────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const sql = getSql();
  // 1. Auth
  const apiKey = req.headers.get('x-api-key') ?? req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
  }
  const keyData = await verifyKey(apiKey);
  if (!keyData) {
    return NextResponse.json({ error: 'Invalid or revoked API key' }, { status: 401 });
  }
  const { walletAddress, coinPublicKey } = keyData;

  // 2. Parse body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const model: string = body.model ?? '';

  // 3. Pick provider
  let provider: Provider | null = null;
  try {
    const providers = await getProviders();
    provider = pickProvider(providers, model);
  } catch (e: any) {
    console.error('[gateway] provider lookup failed:', e.message);
  }

  if (!provider) {
    return NextResponse.json({ error: 'No providers available for this model' }, { status: 503 });
  }

  // 4. Proxy to provider enclave
  // The enclave expects: POST /infer with encrypted payload from the SDK.
  // For gateway mode we forward the raw OpenAI-style body to /v1/chat/completions
  // on the enclave (provider runs an OpenAI-compatible endpoint internally).
  // Relay endpoints already include the full path (/relay/:id)
  // Direct endpoints are bare host URLs (http://1.2.3.4:8080)
  const isRelay = provider.endpoint.includes('/relay/');
  const targetUrl = isRelay
    ? provider.endpoint
    : `${provider.endpoint.replace(/\/$/, '')}/v1/chat/completions`;

  let providerRes: Response;
  try {
    providerRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-Wallet-Address': walletAddress,
        ...(coinPublicKey ? { 'X-Coin-Public-Key': coinPublicKey } : {}),
      },
      body: JSON.stringify(body),
      // @ts-ignore — Node 18+ supports this
      signal: AbortSignal.timeout(115_000),
    });
  } catch (e: any) {
    console.error(`[gateway] upstream ${provider.endpoint} failed:`, e.message);
    return NextResponse.json({ error: 'Provider unreachable', provider: provider.id }, { status: 502 });
  }

  // 5. Stream or return response
  const contentType = providerRes.headers.get('content-type') ?? 'application/json';

  if (body.stream && providerRes.body) {
    return new Response(providerRes.body, {
      status: providerRes.status,
      headers: {
        'Content-Type': contentType,
        'X-ZKai-Provider': provider.id,
      },
    });
  }

  const responseBody = await providerRes.text();

  // Log job to DB (fire and forget)
  if (providerRes.ok) {
    const jobData = (() => { try { return JSON.parse(responseBody); } catch { return null; } })();
    const jobId = jobData?.x_zkai?.job_id ?? jobData?.id ?? crypto.randomUUID();
    const xz = jobData?.x_zkai ?? {};
    const usage = jobData?.usage ?? {};
    sql`INSERT INTO jobs (job_id, wallet_address, provider_id, amount, model, attestation_hash, prompt_tokens, completion_tokens, duration_ms, cpu_percent, ram_mb)
        VALUES (${jobId}, ${walletAddress}, ${provider.id}, ${provider.price}, ${model},
                ${xz.attestation_hash ?? null},
                ${usage.prompt_tokens ?? null}, ${usage.completion_tokens ?? null},
                ${xz.duration_ms ?? null}, ${xz.cpu_percent ?? null}, ${xz.ram_mb ?? null})
        ON CONFLICT (job_id) DO NOTHING`.catch(() => {});
  }

  return new Response(responseBody, {
    status: providerRes.status,
    headers: {
      'Content-Type': contentType,
      'X-ZKai-Provider': provider.id,
    },
  });
}
