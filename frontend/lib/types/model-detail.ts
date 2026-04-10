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
  regions: Array<{
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
  benchmarkRadar: Array<{
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

export interface ModelDetailViewModel {
  hero: ModelHeroData;
  price: ModelPriceData;
  uptime: ModelUptimeData;
  providers: ModelProvidersData;
  performance: ModelPerformanceData;
  apps: ModelAppsData;
  activity: ModelActivityData;
  api: ModelApiData;
}
