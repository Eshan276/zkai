/** A single zkAI provider record from the internal `providers` DB table. */
export interface ZkaiProviderRecord {
  id: string;
  endpoint: string;
  price: number;
  reputation: number;
  hardware?: Record<string, unknown>;
  /** Computed from jobs table -- success rate for recent jobs, null when no jobs exist. */
  uptime?: number;
  /** Average job duration in ms across all attested completed jobs, null when no jobs yet. */
  avgLatencyMs?: number | null;
}

export interface ModelHeroData {
  slug: string;
  name: string;
  provider: string;
  author: string;
  description: string;
  category: string;
  modalities: string[];
  series: string[];
  tags: string[];
  contextLength: number;
  tokens: string;
  inputPrice: string;
  outputPrice: string;
  inputPriceRaw: number;
  outputPriceRaw: number;
  isFree: boolean;
  isNew: boolean;
  lastUpdated: string;
  supportsReasoning: boolean;
  /** Best-matching zkAI provider for this model (highest reputation), if any exists. */
  zkaiProvider?: ZkaiProviderRecord;
}

export interface ModelPriceData {
  inputPerM: number;
  outputPerM: number;
  effectivePerM: number;
  discountPercent: number;
  trend: Array<{
    day: string;
    input: number;
    output: number;
    effective: number;
  }>;
  tiers: Array<{
    name: string;
    requestsShare: number;
    costPer1k: number;
  }>;
}

export interface ModelUptimeData {
  currentPercent: number;
  incidentCount30d: number;
  timeline: Array<{
    hour: string;
    uptime: number;
    errorRate: number;
  }>;
  /** Regional breakdown -- only available when external provider data exists. */
  regions?: Array<{
    region: string;
    uptime: number;
    latencyMs: number;
  }>;
}

export interface ModelProvidersData {
  distribution: Array<{
    provider: string;
    share: number;
    p95LatencyMs: number;
    availability: number;
  }>;
  endpoints: Array<{
    endpoint: string;
    region: string;
    status: "healthy" | "degraded" | "unstable";
    uptime: number;
    throughputRps: number;
  }>;
  /** All active zkAI providers for this model from the internal `providers` table. */
  zkaiProviders?: ZkaiProviderRecord[];
}

export interface ModelPerformanceData {
  summary: {
    medianTtftMs: number;
    medianTokensPerSecond: number;
    p95LatencyMs: number;
    qualityScore: number;
  };
  latencySeries: Array<{
    bucket: string;
    p50: number;
    p95: number;
  }>;
  /** Benchmark radar data -- only available when Artificial Analysis data exists. */
  benchmarkRadar?: Array<{
    metric: string;
    score: number;
  }>;
  /** Computed from real job telemetry -- present when jobs have cpu_percent / ram_mb data. */
  avgCpuPercent?: number;
  avgRamMb?: number;
}

export interface ModelAppsData {
  adoptionSeries: Array<{
    week: string;
    apps: number;
    requestsK: number;
  }>;
  topApps: Array<{
    name: string;
    category: string;
    calls: string;
    growthPercent: number;
  }>;
}

export interface ModelActivityData {
  requests24h: number;
  requestSeries: Array<{
    hour: string;
    requests: number;
    successRate: number;
  }>;
  operationMix: Array<{
    name: string;
    value: number;
  }>;
}

/**
 * A single data point in an OpenRouter time-series performance chart.
 * `y` maps provider/endpoint UUID → metric value.
 */
export interface ORPerfPoint {
  x: string;
  y: Record<string, number>;
  volume?: Record<string, number>;
}

/**
 * OpenRouter-sourced performance metrics for the Performance tab.
 * Fetched from openrouter.ai/api/frontend/stats/* endpoints.
 * This is shown in the UI while we don't yet have our own telemetry endpoint.
 */
export interface ORPerformanceStats {
  /** Stable permaslug used to fetch these stats */
  permaslug: string;
  /** Throughput in tokens/sec per day */
  throughput: ORPerfPoint[];
  /** TTFT latency in ms per day */
  latency: ORPerfPoint[];
  /** End-to-end latency in ms per day */
  latencyE2e: ORPerfPoint[];
  /** Tool call error rate % per day */
  toolCallErrorRate: ORPerfPoint[];
  /** Structured output error rate % per day */
  structuredOutputErrorRate: ORPerfPoint[];
}

// ─── OpenRouter benchmark types ───────────────────────────────────────────────

/** One model variant returned by the AA benchmarks endpoint */
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

/** One record returned by the Design Arena benchmarks endpoint */
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

/**
 * OpenRouter-sourced benchmark data for the Benchmarks tab.
 * Fetched from the internal OR benchmark endpoints.
 * Absent when both endpoints return empty data.
 */
export interface ORBenchmarkData {
  /** Model slug used to fetch these benchmarks */
  slug: string;
  /** Artificial Analysis benchmark entries (may be multiple variants e.g. reasoning / non-reasoning) */
  aaBenchmarks: ORAAbenchmarkEntry[];
  /** Design Arena records across categories */
  designArena: ORDesignArenaRecord[];
  /** ELO bounds for normalising design arena scores */
  eloBounds?: { min: number; max: number };
}

// ─── OpenRouter apps / activity / uptime types ───────────────────────────────

/** One day of token-usage activity from the top-apps-chart endpoint */
export interface ORActivityDay {
  date: string;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  count: number;
  total_tool_calls: number;
}

/** One app entry from the top-apps-for-model endpoint */
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

/**
 * OpenRouter-sourced Apps + Activity data.
 * Fetched from /api/frontend/stats/top-apps-for-model.
 * Absent when the endpoint returns no data for this model.
 */
export interface ORAppsActivityData {
  /** Model slug used to fetch this data */
  slug: string;
  /** Daily token usage series (prompt + completion) */
  activitySeries: ORActivityDay[];
  /** Top apps by token consumption */
  topApps: ORTopApp[];
}

/** One provider's uptime series from uptime-recent */
export interface ORUptimeProvider {
  providerId: string;
  series: Array<{ date: string; uptime: number }>;
}

/**
 * OpenRouter-sourced Uptime data.
 * Fetched from /api/frontend/stats/uptime-recent.
 * Absent when the endpoint returns no data for this model.
 */
export interface ORUptimeData {
  /** Model slug used to fetch this data */
  slug: string;
  /** Per-provider uptime series (last 3 days) */
  providers: ORUptimeProvider[];
  /** Datadog embed URLs for the live uptime graphs */
  uptimeGraphUrl?: string;
  comparisonGraphUrl?: string;
  finishReasonGraphUrl?: string;
}

export interface ModelApiData {
  baseUrl: string;
  endpoints: Array<{
    method: "GET" | "POST";
    path: string;
    description: string;
  }>;
  sampleRequest: string;
  sampleResponse: string;
}

/**
 * Per-section data-availability flags. The API always returns this object so the
 * UI can decide whether to render a section or show an empty state without
 * needing to inspect the section data itself.
 */
export interface ModelDataAvailability {
  price: boolean;
  uptime: boolean;
  performance: boolean;
  providers: boolean;
  activity: boolean;
  apps: boolean;
}

export interface ModelDetailViewModel {
  /** Always populated from the OpenRouter catalog. */
  hero: ModelHeroData;
  /** OpenRouter pricing data -- always present when the model exists in catalog. */
  price?: ModelPriceData;
  /** Populated from jobs table aggregations -- absent when no jobs exist for this model. */
  uptime?: ModelUptimeData;
  /** Populated from providers + jobs tables -- absent when no providers exist. */
  providers?: ModelProvidersData;
  /** Populated from jobs table percentiles -- absent when no jobs exist. */
  performance?: ModelPerformanceData;
  /** No current real data source -- always absent in production. */
  apps?: ModelAppsData;
  /** Populated from jobs table hourly aggregations -- absent when no jobs exist. */
  activity?: ModelActivityData;
  /** Always populated (template-based using the model slug). */
  api: ModelApiData;
  /**
   * OpenRouter performance stats fetched from their frontend stats API.
   * Shown in the Performance tab as a temporary data source until we have
   * our own telemetry endpoint. Absent when the fetch fails or returns no data.
   */
  orPerformance?: ORPerformanceStats;
  /**
   * OpenRouter benchmark data (Artificial Analysis + Design Arena).
   * Shown in the Benchmarks tab. Absent when both endpoints return empty data.
   */
  orBenchmarks?: ORBenchmarkData;
  /**
   * OpenRouter Apps + Activity data (top apps + daily token usage).
   * Shown in the Apps and Activity tabs. Absent when the endpoint returns no data.
   */
  orAppsActivity?: ORAppsActivityData;
  /**
   * OpenRouter Uptime data (per-provider uptime series + Datadog graph URLs).
   * Shown in the Uptime tab. Absent when the endpoint returns no data.
   */
  orUptime?: ORUptimeData;
  /** Flags indicating which sections contain real data vs empty state. */
  hasRealData: ModelDataAvailability;
}
