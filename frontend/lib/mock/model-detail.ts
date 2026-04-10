import type { ModelDetailViewModel } from "@/lib/types/model-detail";

const PROVIDER_POOL = [
  "Nebula Core",
  "Orbital Edge",
  "Flux Compute",
  "Atlas Inference",
  "Northstar AI",
  "Vector Layer",
  "Vertex Runtime",
  "Prism Fabric",
];

const APP_POOL = [
  { name: "PromptForge", category: "Developer Tool" },
  { name: "Caret Studio", category: "Productivity" },
  { name: "VisionRail", category: "Analytics" },
  { name: "TaskHarbor", category: "Automation" },
  { name: "Signal Deck", category: "Operations" },
  { name: "SparkBench", category: "Evaluation" },
  { name: "Nova Docs", category: "Knowledge" },
  { name: "Arc Flow", category: "Workflow" },
];

const REGIONS = ["US-East", "US-West", "EU-West", "Asia-South", "APAC-Singapore"];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hashString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(values: readonly T[], rand: () => number): T {
  return values[Math.floor(rand() * values.length)] as T;
}

function titleCase(text: string): string {
  return text
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cleanProvider(authorSlug: string): string {
  return titleCase(authorSlug.replace(/[^a-z0-9-_ ]/gi, " "));
}

function cleanModelName(modelSlug: string): string {
  const normalized = modelSlug.replace(/[^a-z0-9-. _]/gi, " ").trim();
  if (!normalized) return "Custom Model";
  const withSpaces = normalized.replace(/[-_]+/g, " ");
  return withSpaces
    .split(/\s+/)
    .map((part) => {
      if (/^\d+(\.\d+)?[bk]$/i.test(part)) return part.toUpperCase();
      if (/^gpt|llama|qwen|claude|mistral|gemini|deepseek/i.test(part)) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function parseTokens(name: string, rand: () => number): string {
  const hit = name.match(/(\d+(?:\.\d+)?)\s*([bBkK])/);
  if (hit) return `${hit[1]}${hit[2].toUpperCase()}`;
  const defaults = ["7B", "14B", "32B", "70B", "120B"] as const;
  return pick(defaults, rand);
}

function inferCategory(slug: string, rand: () => number): { category: string; modalities: string[] } {
  const lower = slug.toLowerCase();
  if (lower.includes("image") || lower.includes("vision")) {
    return { category: "multimodal", modalities: ["Text", "Image"] };
  }
  if (lower.includes("audio") || lower.includes("speech") || lower.includes("voice")) {
    return { category: "audio", modalities: ["Text", "Audio"] };
  }
  if (lower.includes("video")) {
    return { category: "video", modalities: ["Text", "Video"] };
  }
  const multimodal = rand() > 0.72;
  return multimodal
    ? { category: "multimodal", modalities: ["Text", "Image"] }
    : { category: "text", modalities: ["Text"] };
}

function formatUsdPerM(value: number): string {
  if (value === 0) return "Free";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(2)}`;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function normalizeShares(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  const scaled = values.map((value) => (value / total) * 100);
  const rounded = scaled.map((value) => Math.round(value * 10) / 10);
  const diff = Math.round((100 - rounded.reduce((sum, value) => sum + value, 0)) * 10) / 10;
  if (rounded.length > 0) rounded[0] += diff;
  return rounded;
}

export function decodeModelSlug(rawSlug: string): string {
  return safeDecode(rawSlug).trim();
}

export function getModelDetailMock(rawSlug: string): ModelDetailViewModel {
  const slug = decodeModelSlug(rawSlug) || "custom/model";
  const seed = hashString(slug);
  const rand = mulberry32(seed);

  const [authorSlug, modelSlugRaw] = slug.includes("/")
    ? (slug.split("/", 2) as [string, string])
    : (["custom", slug] as [string, string]);

  const provider = cleanProvider(authorSlug);
  const name = cleanModelName(modelSlugRaw);
  const tokens = parseTokens(name, rand);
  const { category, modalities } = inferCategory(slug, rand);

  const contextOptions = [8192, 16384, 32768, 65536, 131072, 200000, 256000, 1000000] as const;
  const contextLength = pick(contextOptions, rand);

  const freeProbability = rand();
  const inputPriceRaw = freeProbability > 0.93 ? 0 : Number((0.03 + rand() * 6.4).toFixed(3));
  const outputPriceRaw = inputPriceRaw === 0 ? 0 : Number((inputPriceRaw * (1.8 + rand() * 2.4)).toFixed(3));
  const effectivePerM = Number(((inputPriceRaw + outputPriceRaw) / 2).toFixed(3));
  const discountPercent = inputPriceRaw === 0 ? 0 : Math.round(4 + rand() * 18);

  const supportsReasoning = rand() > 0.45;
  const isNew = rand() > 0.64;

  const tags = [
    supportsReasoning ? "Reasoning" : "Instruction",
    contextLength >= 131072 ? "Long Context" : "Fast Response",
    modalities.includes("Image") ? "Vision" : "Text",
    rand() > 0.52 ? "Tool Calling" : "Structured Output",
    rand() > 0.7 ? "Low Latency" : "Stable Throughput",
  ];

  const priceTrend = Array.from({ length: 14 }, (_, idx) => {
    const day = `D${idx + 1}`;
    const volatility = 0.94 + rand() * 0.14;
    const input = Number((inputPriceRaw * volatility).toFixed(3));
    const output = Number((outputPriceRaw * (0.92 + rand() * 0.18)).toFixed(3));
    const effective = Number(((input + output) / 2).toFixed(3));
    return { day, input, output, effective };
  });

  const priceTiers = normalizeShares([18 + rand() * 20, 25 + rand() * 30, 20 + rand() * 25]).map(
    (share, index) => {
      const names = ["Standard", "Priority", "Burst"] as const;
      const factor = [1, 1.18, 1.34][index] ?? 1;
      return {
        name: names[index] ?? `Tier ${index + 1}`,
        requestsShare: share,
        costPer1k: Number(((effectivePerM * factor) / 1000).toFixed(4)),
      };
    },
  );

  const currentUptime = Number((97.8 + rand() * 2.18).toFixed(2));
  const timeline = Array.from({ length: 24 }, (_, hour) => {
    const baseline = currentUptime - 0.6 + rand() * 1.2;
    const uptime = Number(clamp(baseline, 95.2, 99.99).toFixed(2));
    const errorRate = Number(clamp((100 - uptime) * 0.55 + rand() * 0.08, 0.01, 2.5).toFixed(2));
    return { hour: `${hour.toString().padStart(2, "0")}:00`, uptime, errorRate };
  });

  const regions = REGIONS.map((region) => ({
    region,
    uptime: Number(clamp(currentUptime - 0.8 + rand() * 1.4, 94.8, 99.99).toFixed(2)),
    latencyMs: Math.round(120 + rand() * 470),
  }));

  const providerCandidates = [provider, ...PROVIDER_POOL]
    .filter((value, index, all) => all.indexOf(value) === index)
    .slice(0, 6);

  const distribution = normalizeShares(providerCandidates.slice(0, 4).map(() => 25 + rand() * 45)).map((share, i) => ({
    provider: providerCandidates[i] ?? `Provider ${i + 1}`,
    share,
    p95LatencyMs: Math.round(220 + rand() * 720),
    availability: Number((97 + rand() * 2.8).toFixed(2)),
  }));

  const endpoints = distribution.map((item, i) => {
    const uptime = Number((96.8 + rand() * 3.1).toFixed(2));
    const status = uptime >= 99.2 ? "healthy" : uptime >= 98.2 ? "degraded" : "unstable";
    return {
      endpoint: `${item.provider.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-ep-${i + 1}`,
      region: pick(REGIONS, rand),
      status,
      uptime,
      throughputRps: Math.round(45 + rand() * 420),
    };
  });

  const medianTtftMs = Math.round(140 + rand() * 740);
  const medianTokensPerSecond = Math.round(18 + rand() * 165);
  const p95LatencyMs = Math.round(medianTtftMs * (1.7 + rand() * 1.2));
  const qualityScore = Number((68 + rand() * 30).toFixed(1));

  const latencySeries = Array.from({ length: 8 }, (_, idx) => {
    const bucket = `${(idx + 1) * 2} req/s`;
    const p50 = Math.round(120 + idx * 38 + rand() * 55);
    const p95 = Math.round(p50 * (1.45 + rand() * 0.45));
    return { bucket, p50, p95 };
  });

  const radarMetrics = ["Reasoning", "Coding", "Math", "Vision", "Tool Use", "Instruction"] as const;
  const benchmarkRadar = radarMetrics.map((metric) => ({
    metric,
    score: Number(clamp(qualityScore - 12 + rand() * 24, 50, 99.8).toFixed(1)),
  }));

  const appOffset = Math.floor(rand() * APP_POOL.length);
  const topApps = Array.from({ length: 5 }, (_, idx) => {
    const app = APP_POOL[(appOffset + idx) % APP_POOL.length] ?? APP_POOL[0];
    const monthlyCalls = Math.round(180 + rand() * 2800) * 1000;
    return {
      name: app.name,
      category: app.category,
      calls: `${formatCompact(monthlyCalls)}/mo`,
      growthPercent: Math.round(4 + rand() * 44),
    };
  });

  let appsCount = 25 + Math.round(rand() * 20);
  let requestsK = 120 + Math.round(rand() * 140);
  const adoptionSeries = Array.from({ length: 10 }, (_, idx) => {
    appsCount += Math.round(rand() * 7);
    requestsK += Math.round(20 + rand() * 56);
    return {
      week: `W${idx + 1}`,
      apps: appsCount,
      requestsK,
    };
  });

  const activitySeries = Array.from({ length: 24 }, (_, hour) => {
    const wave = 0.55 + 0.45 * Math.sin((hour / 24) * Math.PI * 2 + rand());
    const requests = Math.round(400 + wave * 2900 + rand() * 240);
    const successRate = Number(clamp(96.1 + rand() * 3.7, 95.5, 99.95).toFixed(2));
    return {
      hour: `${hour.toString().padStart(2, "0")}:00`,
      requests,
      successRate,
    };
  });

  const requests24h = activitySeries.reduce((sum, point) => sum + point.requests, 0);

  const operationMixRaw = normalizeShares([35 + rand() * 20, 10 + rand() * 22, 12 + rand() * 18, 14 + rand() * 16]);
  const operationMixNames = ["Chat", "Tool Calls", "Structured", "Batch"] as const;
  const operationMix = operationMixRaw.map((value, idx) => ({ name: operationMixNames[idx] ?? `Mode ${idx + 1}`, value }));

  const lastUpdatedDaysAgo = Math.round(rand() * 9);
  const updatedDate = new Date();
  updatedDate.setDate(updatedDate.getDate() - lastUpdatedDaysAgo);

  const heroDescription = `${name} is tuned for ${supportsReasoning ? "reasoning-heavy" : "high-throughput"} production workloads with ${contextLength >= 131072 ? "long-context retrieval" : "fast turn latency"}, consistent provider routing, and observability-first API behavior.`;

  return {
    hero: {
      slug,
      name,
      provider,
      author: authorSlug,
      description: heroDescription,
      category,
      modalities,
      series: [provider],
      tags,
      contextLength,
      tokens,
      inputPrice: formatUsdPerM(inputPriceRaw),
      outputPrice: formatUsdPerM(outputPriceRaw),
      inputPriceRaw,
      outputPriceRaw,
      isFree: inputPriceRaw === 0 && outputPriceRaw === 0,
      isNew,
      lastUpdated: updatedDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      supportsReasoning,
    },
    price: {
      inputPerM: inputPriceRaw,
      outputPerM: outputPriceRaw,
      effectivePerM,
      discountPercent,
      trend: priceTrend,
      tiers: priceTiers,
    },
    uptime: {
      currentPercent: currentUptime,
      incidentCount30d: Math.round(rand() * 4),
      timeline,
      regions,
    },
    providers: {
      distribution,
      endpoints,
    },
    performance: {
      summary: {
        medianTtftMs,
        medianTokensPerSecond,
        p95LatencyMs,
        qualityScore,
      },
      latencySeries,
      benchmarkRadar,
    },
    apps: {
      adoptionSeries,
      topApps,
    },
    activity: {
      requests24h,
      requestSeries: activitySeries,
      operationMix,
    },
    api: {
      baseUrl: "https://your-zkai-domain.example/api/v1",
      endpoints: [
        { method: "POST", path: "/chat/completions", description: "Run inference for this model via OpenAI-compatible schema." },
        { method: "GET", path: "/models", description: "List available models and metadata surfaced by your gateway." },
        { method: "GET", path: "/stats/model", description: "Fetch aggregated model reliability and performance snapshots." },
      ],
      sampleRequest: `curl -X POST https://your-zkai-domain.example/api/v1/chat/completions \\\n  -H \"Content-Type: application/json\" \\\n  -H \"Authorization: Bearer <API_KEY>\" \\\n  -d '{\n    "model": "${slug}",\n    "messages": [{"role":"user","content":"Summarize this week\\'s incident report"}],\n    "temperature": 0.4\n  }'`,
      sampleResponse: `{
  "id": "chatcmpl_mock_9h7k",
  "object": "chat.completion",
  "model": "${slug}",
  "created": 1765201152,
  "choices": [
    {
      "index": 0,
      "finish_reason": "stop",
      "message": {
        "role": "assistant",
        "content": "Weekly incidents dropped 12% and p95 latency improved by 18 ms."
      }
    }
  ]
}`,
    },
  };
}
