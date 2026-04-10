import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import type { MergedModel } from '@/lib/types/model';

// ─── In-memory cache (5 min TTL for external APIs) ────────────────────────────

const CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const cache: {
  orModels?: CacheEntry<ORModel[]>;
  aaModels?: CacheEntry<AAModel[]>;
} = {};

// ─── OpenRouter API types ─────────────────────────────────────────────────────

interface ORPricing {
  prompt?: string;
  completion?: string;
  discount?: number;
}

interface OREndpoint {
  pricing?: ORPricing;
  supported_parameters?: string[];
  is_free?: boolean;
}

interface ORModel {
  slug: string;
  name: string;
  short_name?: string;
  author: string;
  author_display_name?: string;
  description: string;
  context_length: number;
  input_modalities: string[];
  output_modalities: string[];
  group?: string | null;
  hidden?: boolean;
  created_at?: string;
  hf_slug?: string | null;
  supports_reasoning?: boolean;
  is_trainable_text?: boolean | null;
  endpoint?: OREndpoint;
}

// ─── Artificial Analysis API types ───────────────────────────────────────────

interface AAModel {
  model?: string;
  name?: string;
  creator?: string;
  artificial_analysis_intelligence_index?: number;
  coding_index?: number;
  math_index?: number;
  median_output_tokens_per_second?: number;
  median_time_to_first_token_seconds?: number;
  [key: string]: unknown;
}

// ─── Internal DB types ────────────────────────────────────────────────────────

interface DBProvider {
  id: string;
  endpoint: string;
  model: string;
  price: number;
  reputation: number;
  hardware?: Record<string, unknown>;
}

interface LatencyStat {
  model: string;
  avg_ms: number;
  success_rate: number;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchOpenRouterModels(): Promise<ORModel[]> {
  if (cache.orModels && Date.now() - cache.orModels.ts < CACHE_TTL) {
    return cache.orModels.data;
  }
  const res = await fetch('https://openrouter.ai/api/frontend/models', {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`OpenRouter fetch failed: ${res.status}`);
  const json = await res.json() as { data?: ORModel[] };
  const data = json.data ?? [];
  cache.orModels = { data, ts: Date.now() };
  return data;
}

async function fetchArtificialAnalysis(): Promise<AAModel[]> {
  if (cache.aaModels && Date.now() - cache.aaModels.ts < CACHE_TTL) {
    return cache.aaModels.data;
  }
  const apiKey = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch('https://artificialanalysis.ai/api/v2/data/llms/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return [];
    const json = await res.json() as { data?: AAModel[] } | AAModel[];
    const data = (Array.isArray(json) ? json : (json.data ?? [])) as AAModel[];
    cache.aaModels = { data, ts: Date.now() };
    return data;
  } catch {
    return [];
  }
}

async function fetchInternalProviders(): Promise<DBProvider[]> {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, endpoint, model, price, reputation, hardware
      FROM providers
      WHERE active = TRUE
      ORDER BY reputation DESC
    `;
    return rows as unknown as DBProvider[];
  } catch {
    return [];
  }
}

async function fetchLatencyStats(): Promise<LatencyStat[]> {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT
        model,
        AVG(duration_ms)::float AS avg_ms,
        (COUNT(*) FILTER (WHERE attestation_hash IS NOT NULL))::float / COUNT(*)::float AS success_rate
      FROM jobs
      WHERE duration_ms IS NOT NULL
      GROUP BY model
    `;
    return (rows as unknown as Array<{ model: string; avg_ms: string; success_rate: string }>).map((r) => ({
      model: r.model,
      avg_ms: parseFloat(r.avg_ms) || 0,
      success_rate: parseFloat(r.success_rate) || 0,
    }));
  } catch {
    return [];
  }
}

// ─── Transform helpers ────────────────────────────────────────────────────────

function deriveCategory(inputMods: string[], outputMods: string[]): string {
  if (outputMods.includes('image')) return 'image';
  if (outputMods.includes('audio')) return 'audio';
  if (outputMods.includes('video')) return 'video';
  if (inputMods.some((m) => m !== 'text')) return 'multimodal';
  return 'text';
}

function deriveModalities(inputMods: string[]): string[] {
  return inputMods.map((m) => m.charAt(0).toUpperCase() + m.slice(1));
}

function extractTokenCount(name: string): string {
  const match = name.match(/(\d+(?:\.\d+)?)\s*[Bb]/);
  return match ? `${match[1]}B` : '';
}

function formatPrice(perMillion: number): string {
  if (perMillion === 0) return 'Free';
  if (perMillion < 0.001) return `$${perMillion.toFixed(5)}`;
  if (perMillion < 0.01) return `$${perMillion.toFixed(4)}`;
  if (perMillion < 1) return `$${perMillion.toFixed(2)}`;
  return `$${perMillion.toFixed(1)}`;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Authors whose models are distributed via HuggingFace / permissive licences
const OSS_AUTHORS = new Set([
  'meta-llama', 'meta', 'google', 'qwen', 'mistral', 'deepseek', 'microsoft',
  'nvidia', 'cohere', 'databricks', 'allenai', 'huggingface', 'tiiuae',
  'openchat', 'nous', 'nousresearch', 'mosaicml', 'rwkv', '01-ai',
  'togethercomputer', 'teknium', 'cognitivecomputations', 'xwin-lm',
]);

function deriveIsOpenSource(orModel: ORModel): boolean {
  if (orModel.hf_slug) return true;
  return OSS_AUTHORS.has(orModel.author.toLowerCase());
}

function deriveTags(orModel: ORModel): string[] {
  const tags: string[] = [];
  const params = orModel.endpoint?.supported_parameters ?? [];
  const name = orModel.name.toLowerCase();

  if (orModel.supports_reasoning) tags.push('Reasoning');
  if (params.includes('tools') || params.includes('tool_choice')) tags.push('Function Calling');
  if (orModel.input_modalities.includes('image')) tags.push('Vision');
  if (orModel.input_modalities.includes('audio')) tags.push('Audio');
  if (orModel.context_length >= 100_000) tags.push('Long Context');
  if (name.includes('code') || name.includes('coder') || name.includes('coding')) tags.push('Coding');
  if (name.includes('math')) tags.push('Math');
  if (orModel.is_trainable_text) tags.push('Fine-tunable');

  return tags;
}

// ─── Matching ─────────────────────────────────────────────────────────────────

function matchProvider(providers: DBProvider[], orModel: ORModel): DBProvider | undefined {
  const slug = orModel.slug;
  const modelPart = slug.split('/')[1] ?? slug;
  return providers.find(
    (p) => p.model === slug || p.model === modelPart || slug.endsWith('/' + p.model),
  );
}

function matchAAModel(aaModels: AAModel[], orModel: ORModel): AAModel | undefined {
  if (aaModels.length === 0) return undefined;
  const slugPart = (orModel.slug.split('/')[1] ?? orModel.slug).toLowerCase();
  const displayName = orModel.name.toLowerCase();

  for (const aa of aaModels) {
    const aaKey = ((aa.model ?? aa.name ?? '') as string).toLowerCase();
    if (!aaKey) continue;
    if (slugPart === aaKey || slugPart.includes(aaKey) || aaKey.includes(slugPart)) return aa;
    if (displayName.includes(aaKey) || aaKey.includes(displayName)) return aa;
  }
  return undefined;
}

// ─── Main transform ───────────────────────────────────────────────────────────

function transformModel(
  orModel: ORModel,
  provider: DBProvider | undefined,
  aaBenchmark: AAModel | undefined,
  latencyStats: LatencyStat[],
): MergedModel {
  const endpoint = orModel.endpoint;
  const pricing = endpoint?.pricing;

  let inputPriceRaw = 0;
  let outputPriceRaw = 0;

  if (provider) {
    // Internal price is stored as $ per 1M tokens
    inputPriceRaw = provider.price;
    outputPriceRaw = provider.price;
  } else if (pricing) {
    inputPriceRaw = parseFloat(pricing.prompt ?? '0') * 1_000_000;
    outputPriceRaw = parseFloat(pricing.completion ?? '0') * 1_000_000;
  }

  const isFree = endpoint?.is_free === true || (!provider && inputPriceRaw === 0 && outputPriceRaw === 0);

  const latencyStat = latencyStats.find(
    (l) => l.model === orModel.slug || l.model === (orModel.slug.split('/')[1] ?? orModel.slug),
  );

  const createdAt = orModel.created_at ? new Date(orModel.created_at) : new Date(0);
  const isNew = Date.now() - createdAt.getTime() < 30 * 24 * 60 * 60 * 1000;

  const result: MergedModel = {
    id: orModel.slug,
    name: orModel.short_name ?? orModel.name,
    provider: orModel.author_display_name ?? orModel.author,
    author: orModel.author,
    description: orModel.description ?? '',
    contextLength: orModel.context_length ?? 0,
    inputPriceRaw,
    inputPrice: isFree ? 'Free' : formatPrice(inputPriceRaw),
    outputPrice: isFree ? 'Free' : formatPrice(outputPriceRaw),
    tokens: extractTokenCount(orModel.name),
    category: deriveCategory(orModel.input_modalities, orModel.output_modalities),
    modalities: deriveModalities(orModel.input_modalities),
    series: orModel.group ? [orModel.group] : [],
    categories: deriveTags(orModel),
    supportedParams: endpoint?.supported_parameters ?? [],
    distillable: false,
    isNew,
    isFree,
    isOpenSource: deriveIsOpenSource(orModel),
    date: orModel.created_at ? formatDate(orModel.created_at) : '',
  };

  if (provider) {
    result.zkaiProvider = provider.id;
    result.zkaiPrice = provider.price;
    if (provider.hardware) result.zkaiHardware = provider.hardware;
    if (latencyStat) {
      result.zkaiLatencyMs = latencyStat.avg_ms;
      result.zkaiUptime = latencyStat.success_rate;
    }
  }

  if (aaBenchmark) {
    result.benchmarks = {
      intelligenceIndex: aaBenchmark.artificial_analysis_intelligence_index,
      codingIndex: aaBenchmark.coding_index,
      mathIndex: aaBenchmark.math_index,
      medianOutputTokensPerSecond: aaBenchmark.median_output_tokens_per_second,
      medianTimeToFirstTokenSeconds: aaBenchmark.median_time_to_first_token_seconds,
    };
  }

  return result;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  try {
    /* ─── PRODUCTION: only active provider models; skip OpenRouter when none ───
     * Uncomment this block and remove the TESTING block below when testing ends.
    const providers = await fetchInternalProviders();

    if (providers.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const [orModels, aaModels, latencyStats] = await Promise.all([
      fetchOpenRouterModels(),
      fetchArtificialAnalysis(),
      fetchLatencyStats(),
    ]);

    const merged = orModels
      .filter((m) => !m.hidden && matchProvider(providers, m))
      .map((orModel) =>
        transformModel(
          orModel,
          matchProvider(providers, orModel),
          matchAAModel(aaModels, orModel),
          latencyStats,
        ),
      );

    return NextResponse.json({ data: merged });
    */

    // ─── TESTING: return one non-hidden OpenRouter model for the models page ───
    const [orModels, aaModels, providers, latencyStats] = await Promise.all([
      fetchOpenRouterModels(),
      fetchArtificialAnalysis(),
      fetchInternalProviders(),
      fetchLatencyStats(),
    ]);
    const merged = orModels
      .filter((m) => !m.hidden)
      .map((orModel) =>
        transformModel(
          orModel,
          matchProvider(providers, orModel),
          matchAAModel(aaModels, orModel),
          latencyStats,
        ),
      );
    return NextResponse.json({ data: merged.slice(0, 1) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
