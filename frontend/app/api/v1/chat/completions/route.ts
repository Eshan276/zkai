/**
 * ZKai Gateway — POST /api/v1/chat/completions
 *
 * OpenAI-compatible endpoint. Consumers send requests here;
 * we verify their API key, pick a provider, and proxy to the enclave.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface Provider {
  id: string;
  endpoint: string;
  model: string;
  price: number;
  reputation: number;
  active: boolean;
}

// Bridge URL — the ZKai bridge has direct on-chain access
const BRIDGE_URL = (process.env.ZKAI_BRIDGE_URL ?? 'http://localhost:7300').replace(/\/$/, '');

// ── Auth ─────────────────────────────────────────────────────────────────────

async function verifyKey(key: string): Promise<string | null> {
  const rows = await sql`
    SELECT wallet_address FROM api_keys
    WHERE key = ${key} AND revoked = FALSE
  `;
  return rows.length > 0 ? rows[0].wallet_address : null;
}

// ── Provider selection ────────────────────────────────────────────────────────

// Cache providers for 30s
let _providerCache: { providers: Provider[]; at: number } | null = null;

async function getProviders(): Promise<Provider[]> {
  const now = Date.now();
  if (_providerCache && now - _providerCache.at < 30_000) {
    return _providerCache.providers;
  }
  const res = await fetch(`${BRIDGE_URL}/providers`, {
    next: { revalidate: 0 },
    // @ts-ignore
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Bridge /providers returned ${res.status}`);
  const providers: Provider[] = await res.json();
  _providerCache = { providers, at: now };
  return providers;
}

function pickProvider(providers: Provider[], model: string): Provider | null {
  const candidates = providers.filter(p => p.active);
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
  // 1. Auth
  const apiKey = req.headers.get('x-api-key') ?? req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
  }
  const walletAddress = await verifyKey(apiKey);
  if (!walletAddress) {
    return NextResponse.json({ error: 'Invalid or revoked API key' }, { status: 401 });
  }

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
  const targetUrl = `${provider.endpoint.replace(/\/$/, '')}/v1/chat/completions`;

  let providerRes: Response;
  try {
    providerRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-Wallet-Address': walletAddress,
      },
      body: JSON.stringify(body),
      // @ts-ignore — Node 18+ supports this
      signal: AbortSignal.timeout(120_000),
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
    sql`INSERT INTO jobs (job_id, wallet_address, provider_id, amount, model)
        VALUES (${jobId}, ${walletAddress}, ${provider.id}, ${provider.price}, ${model})
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
