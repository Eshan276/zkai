/** A single zkAI provider record from the internal `providers` DB table. */
export interface ZkaiProviderRecord {
  id: string;
  endpoint: string;
  price: number;
  reputation: number;
  hardware?: Record<string, unknown>;
  /** Computed from jobs table -- success rate for recent jobs, null when no jobs exist. */
  uptime?: number;
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
  /** Flags indicating which sections contain real data vs empty state. */
  hasRealData: ModelDataAvailability;
}
