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

export interface ORPricing {
  prompt?: string;
  completion?: string;
  discount?: number;
}

export interface OREndpoint {
  pricing?: ORPricing;
  supported_parameters?: string[];
  is_free?: boolean;
}

export interface ORModel {
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
  /** Stable permaslug used for stats endpoints — may include a date suffix */
  permaslug?: string;
}

// ─── Artificial Analysis API types ───────────────────────────────────────────

export interface AAModel {
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

export interface DBProvider {
  id: string;
  endpoint: string;
  model: string;
  price: number;
  reputation: number;
  hardware?: Record<string, unknown>;
  /** Average job duration in ms across all attested completed jobs, null when no jobs yet. */
  avg_latency_ms?: number | null;
}

export interface LatencyStat {
  model: string;
  avg_ms: number;
  success_rate: number;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

export async function fetchOpenRouterModels(): Promise<ORModel[]> {
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

export async function fetchArtificialAnalysis(): Promise<AAModel[]> {
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

export async function fetchInternalProviders(): Promise<DBProvider[]> {
  const remoteUrl = process.env.PROVIDERS_API_URL?.trim();
  if (remoteUrl) {
    try {
      const res = await fetch(remoteUrl, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 30 },
      });
      if (res.ok) {
        const rows = (await res.json()) as unknown;
        if (Array.isArray(rows)) return rows as DBProvider[];
      }
    } catch {
      /* fall through to DB */
    }
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT
        p.id,
        p.endpoint,
        p.model,
        p.price,
        p.reputation,
        p.hardware,
        AVG(j.duration_ms)::float AS avg_latency_ms
      FROM providers p
      LEFT JOIN jobs j
        ON j.provider_id = p.id
        AND j.duration_ms IS NOT NULL
        AND j.attestation_hash IS NOT NULL
      WHERE p.active = TRUE
      GROUP BY p.id, p.endpoint, p.model, p.price, p.reputation, p.hardware
      ORDER BY p.reputation DESC
    `;
    return (rows as unknown as Array<DBProvider & { avg_latency_ms: string | null }>).map((r) => ({
      ...r,
      avg_latency_ms: r.avg_latency_ms != null ? Math.round(parseFloat(r.avg_latency_ms)) : null,
    }));
  } catch {
    return [];
  }
}

export interface DBProviderForModel {
  id: string;
  endpoint: string;
  price: number;
  reputation: number;
  hardware?: Record<string, unknown>;
  avg_latency_ms?: number | null;
}

export interface HourlyJobStat {
  hour: string;
  requests: number;
  success_rate: number;
  avg_latency_ms: number;
  p50_ms: number;
  p95_ms: number;
}

export async function fetchProvidersForModel(slug: string): Promise<DBProviderForModel[]> {
  const providers = await fetchInternalProviders();
  const matched = providers.filter((p) => providerMatchesOpenRouterSlug(p, slug));
  return matched
    .map((r) => ({
      id: r.id,
      endpoint: r.endpoint,
      price: typeof r.price === 'string' ? parseFloat(r.price) : r.price,
      reputation: typeof r.reputation === 'string' ? parseFloat(r.reputation) : r.reputation,
      hardware: r.hardware as Record<string, unknown> | undefined,
      avg_latency_ms: r.avg_latency_ms ?? null,
    }))
    .sort((a, b) => b.reputation - a.reputation);
}

export async function fetchHourlyJobStats(slug: string): Promise<HourlyJobStat[]> {
  try {
    const sql = getSql();
    const modelPart = slug.split('/')[1] ?? slug;
    const rows = await sql`
      SELECT
        date_trunc('hour', created_at) AS hour,
        COUNT(*)::int AS requests,
        (COUNT(*) FILTER (WHERE attestation_hash IS NOT NULL))::float / COUNT(*)::float AS success_rate,
        AVG(duration_ms)::float AS avg_latency_ms,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms)::float AS p50_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::float AS p95_ms
      FROM jobs
      WHERE (model = ${slug} OR model = ${modelPart})
        AND created_at > NOW() - INTERVAL '24 hours'
      GROUP BY hour
      ORDER BY hour
    `;
    return (rows as unknown as Array<{
      hour: string | Date; requests: string | number; success_rate: string | number;
      avg_latency_ms: string | number; p50_ms: string | number; p95_ms: string | number;
    }>).map((r) => ({
      hour: r.hour instanceof Date ? r.hour.toISOString() : String(r.hour),
      requests: typeof r.requests === 'string' ? parseInt(r.requests, 10) : r.requests,
      success_rate: typeof r.success_rate === 'string' ? parseFloat(r.success_rate) : (r.success_rate ?? 0),
      avg_latency_ms: typeof r.avg_latency_ms === 'string' ? parseFloat(r.avg_latency_ms) : (r.avg_latency_ms ?? 0),
      p50_ms: typeof r.p50_ms === 'string' ? parseFloat(r.p50_ms) : (r.p50_ms ?? 0),
      p95_ms: typeof r.p95_ms === 'string' ? parseFloat(r.p95_ms) : (r.p95_ms ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function fetchLatencyStats(): Promise<LatencyStat[]> {
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

// ─── Job-level performance stats ─────────────────────────────────────────────

export interface JobPerformanceStats {
  avgTps: number | null;
  avgCpuPercent: number | null;
  avgRamMb: number | null;
}

export async function fetchJobPerformanceStats(slug: string): Promise<JobPerformanceStats> {
  try {
    const sql = getSql();
    const modelPart = slug.split('/')[1] ?? slug;
    const rows = await sql`
      SELECT
        AVG(
          (COALESCE(prompt_tokens, 0) + COALESCE(completion_tokens, 0))::float
          / NULLIF(duration_ms, 0) * 1000
        ) AS avg_tps,
        AVG(cpu_percent)  AS avg_cpu_percent,
        AVG(ram_mb)       AS avg_ram_mb
      FROM jobs
      WHERE (model = ${slug} OR model = ${modelPart})
        AND duration_ms > 0
        AND attestation_hash IS NOT NULL
    `;
    const r = (rows as unknown as Array<{
      avg_tps: string | null;
      avg_cpu_percent: string | null;
      avg_ram_mb: string | null;
    }>)[0];
    return {
      avgTps: r?.avg_tps != null ? parseFloat(r.avg_tps) : null,
      avgCpuPercent: r?.avg_cpu_percent != null ? parseFloat(r.avg_cpu_percent) : null,
      avgRamMb: r?.avg_ram_mb != null ? parseFloat(r.avg_ram_mb) : null,
    };
  } catch {
    return { avgTps: null, avgCpuPercent: null, avgRamMb: null };
  }
}

// ─── Transform helpers ────────────────────────────────────────────────────────

export function deriveCategory(inputMods: string[], outputMods: string[]): string {
  if (outputMods.includes('image')) return 'image';
  if (outputMods.includes('audio')) return 'audio';
  if (outputMods.includes('video')) return 'video';
  if (inputMods.some((m) => m !== 'text')) return 'multimodal';
  return 'text';
}

export function deriveModalities(inputMods: string[]): string[] {
  return inputMods.map((m) => m.charAt(0).toUpperCase() + m.slice(1));
}

export function extractTokenCount(name: string): string {
  const match = name.match(/(\d+(?:\.\d+)?)\s*[Bb]/);
  return match ? `${match[1]}B` : '';
}

export function formatPrice(perMillion: number): string {
  if (perMillion === 0) return 'Free';
  if (perMillion < 0.001) return `$${perMillion.toFixed(5)}`;
  if (perMillion < 0.01) return `$${perMillion.toFixed(4)}`;
  if (perMillion < 1) return `$${perMillion.toFixed(2)}`;
  return `$${perMillion.toFixed(1)}`;
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Authors whose models are distributed via HuggingFace / permissive licences
export const OSS_AUTHORS = new Set([
  'meta-llama', 'meta', 'google', 'qwen', 'mistral', 'deepseek', 'microsoft',
  'nvidia', 'cohere', 'databricks', 'allenai', 'huggingface', 'tiiuae',
  'openchat', 'nous', 'nousresearch', 'mosaicml', 'rwkv', '01-ai',
  'togethercomputer', 'teknium', 'cognitivecomputations', 'xwin-lm',
]);

export function deriveIsOpenSource(orModel: ORModel): boolean {
  if (orModel.hf_slug) return true;
  return OSS_AUTHORS.has(orModel.author.toLowerCase());
}

export function deriveTags(orModel: ORModel): string[] {
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

// ─── Provider → OpenRouter alias overrides ────────────────────────────────────
//
// Use this when a provider runs a model that doesn't exist on OpenRouter.
// The value is the OR slug whose metadata (description, context, capabilities)
// will be borrowed; the display name is still derived from the provider model.
//
export const PROVIDER_OR_ALIASES: Record<string, string> = {
  'qwen2.5:1.5b': 'qwen/qwen-2.5-7b-instruct',
};

// ─── Matching ─────────────────────────────────────────────────────────────────

/** Normalize Ollama-style ids (e.g. qwen2.5:1.5b) vs OpenRouter slugs (qwen2.5-1.5b-instruct). */
function normalizeProviderModelId(s: string): string {
  return s.toLowerCase().trim().replace(/:/g, '-').replace(/_/g, '-');
}

/** True if a registered provider row corresponds to this OpenRouter model slug. */
export function providerMatchesOpenRouterSlug(p: DBProvider, orSlug: string): boolean {
  const modelPart = orSlug.split('/')[1] ?? orSlug;
  const partNorm = normalizeProviderModelId(modelPart);
  const slugNorm = normalizeProviderModelId(orSlug);
  const pm = normalizeProviderModelId(p.model);
  if (p.model === orSlug || p.model === modelPart || orSlug.endsWith(`/${p.model}`)) return true;
  if (pm === partNorm || pm === slugNorm) return true;
  if (partNorm.startsWith(`${pm}-`) || pm.startsWith(`${partNorm}-`)) return true;
  // Alias: provider model points to this OR slug
  if (PROVIDER_OR_ALIASES[p.model] === orSlug) return true;
  return false;
}

export function matchProvider(providers: DBProvider[], orModel: ORModel): DBProvider | undefined {
  return providers.find((p) => providerMatchesOpenRouterSlug(p, orModel.slug));
}

export function matchAAModel(aaModels: AAModel[], orModel: ORModel): AAModel | undefined {
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

// ─── OpenRouter performance stats ────────────────────────────────────────────

export interface ORPerformancePoint {
  x: string;
  y: Record<string, number>;
  volume?: Record<string, number>;
}

export interface ORPerformanceData {
  /** Throughput in tokens/sec per day, keyed by endpoint UUID */
  throughput: ORPerformancePoint[];
  /** TTFT latency in ms per day */
  latency: ORPerformancePoint[];
  /** End-to-end latency in ms per day */
  latencyE2e: ORPerformancePoint[];
  /** Tool call error rate % per day */
  toolCallErrorRate: ORPerformancePoint[];
  /** Structured output error rate % per day */
  structuredOutputErrorRate: ORPerformancePoint[];
  /** The stable permaslug used for these stats (may differ from URL slug) */
  permaslug: string;
}

async function fetchORStat(path: string, permaslug: string): Promise<ORPerformancePoint[]> {
  try {
    const url = `https://openrouter.ai/api/frontend/stats/${path}?permaslug=${encodeURIComponent(permaslug)}`;
    const res = await fetch(url, {
      headers: {
        Accept: '*/*',
        Referer: 'https://openrouter.ai/',
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json() as { data?: ORPerformancePoint[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

/**
 * Resolve the permaslug for a given URL slug by looking it up in the models catalog.
 * The permaslug is stable and may differ from the URL slug (e.g. includes a date suffix).
 */
export function resolveORPermaslug(urlSlug: string, orModels: ORModel[]): string {
  const match = orModels.find((m) => m.slug === urlSlug);
  return match?.permaslug ?? urlSlug;
}

export async function fetchORPerformanceStats(permaslug: string): Promise<ORPerformanceData> {
  const [throughput, latency, latencyE2e, toolCallErrorRate, structuredOutputErrorRate] =
    await Promise.all([
      fetchORStat('throughput-comparison', permaslug),
      fetchORStat('latency-comparison', permaslug),
      fetchORStat('latency-e2e-comparison', permaslug),
      fetchORStat('tool-call-error-rate', permaslug),
      fetchORStat('structured-output-error-rate', permaslug),
    ]);
  return { throughput, latency, latencyE2e, toolCallErrorRate, structuredOutputErrorRate, permaslug };
}

// ─── OpenRouter benchmark data ────────────────────────────────────────────────

export interface ORAAbenchmarkEntry {
  aa_id: string;
  aa_slug: string;
  aa_name: string;
  permaslug: string;
  openrouter_slug: string;
  benchmark_data: {
    model_type: string;
    evaluations: Record<string, number>;
  };
  last_updated_at: number;
  percentiles: {
    intelligence_percentile?: number;
    coding_percentile?: number;
    agentic_percentile?: number;
  };
}

export interface ORDesignArenaRecord {
  da_model_id: string;
  display_name: string;
  provider: string;
  openrouter_id: string;
  permaslug: string;
  arena: string;
  category: string;
  elo: number;
  win_rate: number;
  avg_generation_time_ms: number | null;
  last_updated_at: number;
  elo_percentile: number;
  first_place: number;
  second_place: number;
  third_place: number;
  fourth_place: number;
  total_tournaments: number;
}

export interface ORBenchmarkResult {
  aaBenchmarks: ORAAbenchmarkEntry[];
  designArena: ORDesignArenaRecord[];
  eloBounds?: { min: number; max: number };
}

/**
 * Fetch Artificial Analysis + Design Arena benchmark data from OpenRouter's
 * internal benchmark endpoints for a given model slug.
 * Returns empty arrays on any failure — these endpoints are undocumented and
 * may not have data for every model.
 */
export async function fetchORBenchmarks(slug: string): Promise<ORBenchmarkResult> {
  const baseHeaders = {
    Accept: '*/*',
    Referer: `https://openrouter.ai/${slug}`,
  };

  const [aaRes, daRes] = await Promise.all([
    fetch(
      `https://openrouter.ai/api/internal/v1/artificial-analysis-benchmarks?slug=${encodeURIComponent(slug)}`,
      { headers: baseHeaders, next: { revalidate: 300 } },
    ).catch(() => null),
    fetch(
      `https://openrouter.ai/api/internal/v1/design-arena-benchmarks?slug=${encodeURIComponent(slug)}`,
      { headers: baseHeaders, next: { revalidate: 300 } },
    ).catch(() => null),
  ]);

  let aaBenchmarks: ORAAbenchmarkEntry[] = [];
  if (aaRes?.ok) {
    try {
      const json = await aaRes.json() as { data?: ORAAbenchmarkEntry[] };
      aaBenchmarks = json.data ?? [];
    } catch { /* ignore */ }
  }

  let designArena: ORDesignArenaRecord[] = [];
  let eloBounds: { min: number; max: number } | undefined;
  if (daRes?.ok) {
    try {
      const json = await daRes.json() as { data?: { records?: ORDesignArenaRecord[]; eloBounds?: { min: number; max: number } } };
      designArena = json.data?.records ?? [];
      eloBounds = json.data?.eloBounds;
    } catch { /* ignore */ }
  }

  return { aaBenchmarks, designArena, eloBounds };
}

// ─── OpenRouter apps / activity / uptime data ─────────────────────────────────

export interface ORActivityDay {
  date: string;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  count: number;
  total_tool_calls: number;
}

export interface ORTopApp {
  rank: number;
  total_tokens: string;
  total_requests: number;
  app: {
    id: number;
    title: string;
    description: string | null;
    origin_url: string | null;
    favicon_url: string | null;
    categories: string[];
  };
}

export interface ORAppsActivityResult {
  activitySeries: ORActivityDay[];
  topApps: ORTopApp[];
}

export interface ORUptimeProviderSeries {
  providerId: string;
  series: Array<{ date: string; uptime: number }>;
}

export interface ORUptimeResult {
  providers: ORUptimeProviderSeries[];
  uptimeGraphUrl?: string;
  comparisonGraphUrl?: string;
  finishReasonGraphUrl?: string;
}

/**
 * Fetch top-apps + daily activity data from OpenRouter's frontend stats API.
 * Uses the top-apps-for-model endpoint which includes both top_apps and
 * top_apps_chart (daily token usage series).
 */
export async function fetchORAppsActivity(permaslug: string): Promise<ORAppsActivityResult> {
  try {
    const url = `https://openrouter.ai/api/frontend/stats/top-apps-for-model?permaslug=${encodeURIComponent(permaslug)}&variant=standard`;
    const res = await fetch(url, {
      headers: { Accept: '*/*', Referer: `https://openrouter.ai/${permaslug}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) return { activitySeries: [], topApps: [] };
    const json = await res.json() as {
      data?: {
        top_apps?: ORTopApp[];
        top_apps_chart?: ORActivityDay[];
      };
    };
    return {
      activitySeries: json.data?.top_apps_chart ?? [],
      topApps: json.data?.top_apps ?? [],
    };
  } catch {
    return { activitySeries: [], topApps: [] };
  }
}

/**
 * Fetch per-provider uptime series + Datadog graph embed URLs from OpenRouter.
 * uptime-recent returns a map of endpointUUID → [{date, uptime}] for last 3 days.
 * uptime-graphs returns Datadog embed URLs for the live charts.
 */
export async function fetchORUptime(permaslug: string): Promise<ORUptimeResult> {
  const headers = { Accept: '*/*', Referer: `https://openrouter.ai/${permaslug}` };

  const [recentRes, graphsRes] = await Promise.all([
    fetch(
      `https://openrouter.ai/api/frontend/stats/uptime-recent?permaslug=${encodeURIComponent(permaslug)}`,
      { headers, next: { revalidate: 120 } },
    ).catch(() => null),
    fetch(
      `https://openrouter.ai/api/frontend/uptime-graphs?permaslug=${encodeURIComponent(permaslug)}&variant=standard`,
      { headers, next: { revalidate: 300 } },
    ).catch(() => null),
  ]);

  let providers: ORUptimeProviderSeries[] = [];
  if (recentRes?.ok) {
    try {
      const json = await recentRes.json() as { data?: Record<string, Array<{ date: string; uptime: number }>> };
      providers = Object.entries(json.data ?? {}).map(([providerId, series]) => ({
        providerId,
        series,
      }));
    } catch { /* ignore */ }
  }

  let uptimeGraphUrl: string | undefined;
  let comparisonGraphUrl: string | undefined;
  let finishReasonGraphUrl: string | undefined;
  if (graphsRes?.ok) {
    try {
      const json = await graphsRes.json() as { data?: { overallGraphUrl?: string; comparisonGraphUrl?: string; finishReasonGraphUrl?: string } };
      uptimeGraphUrl = json.data?.overallGraphUrl;
      comparisonGraphUrl = json.data?.comparisonGraphUrl;
      finishReasonGraphUrl = json.data?.finishReasonGraphUrl;
    } catch { /* ignore */ }
  }

  return { providers, uptimeGraphUrl, comparisonGraphUrl, finishReasonGraphUrl };
}

// ─── Main transform ───────────────────────────────────────────────────────────

export function transformModel(
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

  // When the provider uses an alias (e.g. qwen2.5:1.5b → qwen-2.5-7b-instruct),
  // show the provider's real model name but keep all OR metadata.
  const aliasedProviderModel = provider ? PROVIDER_OR_ALIASES[provider.model] : undefined;
  const isAliased = aliasedProviderModel === orModel.slug;
  const displayName = isAliased && provider
    ? prettyModelName(provider.model)
    : (orModel.short_name ?? orModel.name);
  const displayTokens = isAliased && provider
    ? extractTokenCount(provider.model)
    : extractTokenCount(orModel.name);

  const result: MergedModel = {
    id: orModel.slug,
    name: displayName,
    provider: orModel.author_display_name ?? orModel.author,
    author: orModel.author,
    description: orModel.description ?? '',
    contextLength: orModel.context_length ?? 0,
    inputPriceRaw,
    inputPrice: isFree ? 'Free' : formatPrice(inputPriceRaw),
    outputPrice: isFree ? 'Free' : formatPrice(outputPriceRaw),
    tokens: displayTokens,
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

// ─── Synthesize a MergedModel from a provider row when OpenRouter has no match ─

/** Derive a pretty display name from an Ollama-style model id (e.g. "qwen2.5:1.5b" → "Qwen2.5 1.5B"). */
function prettyModelName(model: string): string {
  const base = model.split(':')[0];
  const tag = model.includes(':') ? model.split(':')[1] : undefined;
  const name = base
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
  return tag ? `${name} ${tag.toUpperCase()}` : name;
}

/** Guess the author from an Ollama-style model id (e.g. "qwen2.5:1.5b" → "qwen"). */
function guessAuthor(model: string): string {
  const base = model.split(':')[0].split('/')[0];
  for (const oss of OSS_AUTHORS) {
    if (base.toLowerCase().startsWith(oss)) return oss;
  }
  return base.toLowerCase();
}

export function synthesizeProviderModel(
  provider: DBProvider,
  latencyStats: LatencyStat[],
): MergedModel {
  const modelId = `provider/${provider.id}/${provider.model}`;
  const name = prettyModelName(provider.model);
  const author = guessAuthor(provider.model);
  const tokens = extractTokenCount(provider.model);
  const latencyStat = latencyStats.find(
    (l) => l.model === provider.model || l.model === provider.id,
  );

  const result: MergedModel = {
    id: modelId,
    name,
    provider: author,
    author,
    description: `Self-hosted model available via the ZKai provider network.`,
    contextLength: 0,
    inputPriceRaw: provider.price,
    inputPrice: formatPrice(provider.price),
    outputPrice: formatPrice(provider.price),
    tokens,
    category: 'text',
    modalities: ['Text'],
    series: [],
    categories: [],
    supportedParams: [],
    distillable: false,
    isNew: false,
    isFree: provider.price === 0,
    isOpenSource: OSS_AUTHORS.has(author),
    date: '',
    zkaiProvider: provider.id,
    zkaiPrice: provider.price,
  };

  if (provider.hardware) result.zkaiHardware = provider.hardware;
  if (latencyStat) {
    result.zkaiLatencyMs = latencyStat.avg_ms;
    result.zkaiUptime = latencyStat.success_rate;
  }

  return result;
}
