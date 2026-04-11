import { NextResponse } from 'next/server';
import {
  fetchOpenRouterModels,
  fetchArtificialAnalysis,
  fetchProvidersForModel,
  fetchHourlyJobStats,
  fetchJobPerformanceStats,
  fetchORPerformanceStats,
  fetchORBenchmarks,
  fetchORAppsActivity,
  fetchORUptime,
  resolveORPermaslug,
  matchAAModel,
  deriveCategory,
  deriveModalities,
  extractTokenCount,
  formatPrice,
  formatDate,
  deriveTags,
} from '@/lib/data/model-fetchers';
import type { ModelDetailViewModel } from '@/lib/types/model-detail';

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug: rawSlug } = await params;
    const slug = decodeURIComponent(rawSlug);

    const [orModels, aaModels] = await Promise.all([
      fetchOpenRouterModels(),
      fetchArtificialAnalysis(),
    ]);

    const orModel = orModels.find((m) => m.slug === slug);
    if (!orModel) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    const permaslug = resolveORPermaslug(slug, orModels);

    const [dbProviders, hourlyStats, jobPerfStats, orPerfStats, orBenchmarkData, orAppsActivityData, orUptimeData] = await Promise.all([
      fetchProvidersForModel(slug),
      fetchHourlyJobStats(slug),
      fetchJobPerformanceStats(slug),
      fetchORPerformanceStats(permaslug),
      fetchORBenchmarks(slug),
      fetchORAppsActivity(permaslug),
      fetchORUptime(permaslug),
    ]);

    const aaModel = matchAAModel(aaModels, orModel);

    // ─── Pricing ──────────────────────────────────────────────────────────────

    const pricing = orModel.endpoint?.pricing;
    let inputPriceRaw = 0;
    let outputPriceRaw = 0;

    const primaryProvider = dbProviders[0];
    if (primaryProvider) {
      inputPriceRaw = primaryProvider.price;
      outputPriceRaw = primaryProvider.price;
    } else if (pricing) {
      inputPriceRaw = parseFloat(pricing.prompt ?? '0') * 1_000_000;
      outputPriceRaw = parseFloat(pricing.completion ?? '0') * 1_000_000;
    }

    const isFree =
      orModel.endpoint?.is_free === true ||
      (!primaryProvider && inputPriceRaw === 0 && outputPriceRaw === 0);
    const effectivePerM = (inputPriceRaw + outputPriceRaw) / 2;

    // ─── Hero ─────────────────────────────────────────────────────────────────

    const createdAt = orModel.created_at ? new Date(orModel.created_at) : new Date(0);
    const isNew = Date.now() - createdAt.getTime() < 30 * 24 * 60 * 60 * 1000;

    const hero: ModelDetailViewModel['hero'] = {
      slug,
      name: orModel.short_name ?? orModel.name,
      provider: orModel.author_display_name ?? orModel.author,
      author: orModel.author,
      description: orModel.description ?? '',
      category: deriveCategory(orModel.input_modalities, orModel.output_modalities),
      modalities: deriveModalities(orModel.input_modalities),
      series: orModel.group ? [orModel.group] : [],
      tags: deriveTags(orModel),
      contextLength: orModel.context_length ?? 0,
      tokens: extractTokenCount(orModel.name),
      inputPrice: isFree ? 'Free' : formatPrice(inputPriceRaw),
      outputPrice: isFree ? 'Free' : formatPrice(outputPriceRaw),
      inputPriceRaw,
      outputPriceRaw,
      isFree,
      isNew,
      lastUpdated: orModel.created_at ? formatDate(orModel.created_at) : '',
      supportsReasoning: orModel.supports_reasoning ?? false,
      ...(primaryProvider && {
        zkaiProvider: {
          id: primaryProvider.id,
          endpoint: primaryProvider.endpoint,
          price: primaryProvider.price,
          reputation: primaryProvider.reputation,
          hardware: primaryProvider.hardware,
        },
      }),
    };

    // ─── Price ────────────────────────────────────────────────────────────────

    const discountPercent = pricing?.discount ? Math.round(pricing.discount * 100) : 0;

    const price: ModelDetailViewModel['price'] = {
      inputPerM: inputPriceRaw,
      outputPerM: outputPriceRaw,
      effectivePerM,
      discountPercent,
      trend: [],
      tiers: [
        {
          name: 'Standard',
          requestsShare: 100,
          costPer1k: Number((effectivePerM / 1000).toFixed(4)),
        },
      ],
    };

    // ─── Activity (from hourly job stats) ─────────────────────────────────────

    const hasActivity = hourlyStats.length > 0;

    // Build a 24-slot map keyed by "HH:00" label
    const statsMap = new Map<string, (typeof hourlyStats)[0]>();
    for (const row of hourlyStats) {
      const d = new Date(row.hour);
      const label = `${d.getUTCHours().toString().padStart(2, '0')}:00`;
      statsMap.set(label, row);
    }

    const requestSeries = Array.from({ length: 24 }, (_, i) => {
      const label = `${i.toString().padStart(2, '0')}:00`;
      const row = statsMap.get(label);
      return {
        hour: label,
        requests: row?.requests ?? 0,
        successRate: row ? Number((row.success_rate * 100).toFixed(2)) : 0,
      };
    });

    const requests24h = requestSeries.reduce((s, p) => s + p.requests, 0);

    const activity: ModelDetailViewModel['activity'] = {
      requests24h,
      requestSeries,
      operationMix: [{ name: 'Chat', value: 100 }],
    };

    // ─── Uptime (from hourly job stats success rates) ─────────────────────────

    const hasUptime = hasActivity;

    const uptimeTimeline = requestSeries.map((p) => ({
      hour: p.hour,
      uptime: p.requests > 0 ? p.successRate : 0,
      errorRate: p.requests > 0 ? Number((100 - p.successRate).toFixed(2)) : 0,
    }));

    const activeHours = uptimeTimeline.filter((h) => h.uptime > 0);
    const currentPercent =
      activeHours.length > 0
        ? Number(
            (
              activeHours.reduce((s, h) => s + h.uptime, 0) / activeHours.length
            ).toFixed(2),
          )
        : 0;

    const incidentCount30d = activeHours.filter((h) => h.uptime < 99).length;

    const uptime: ModelDetailViewModel['uptime'] = {
      currentPercent,
      incidentCount30d,
      timeline: uptimeTimeline,
      regions: [],
    };

    // ─── Performance (from hourly stats + AA benchmarks) ──────────────────────

    const hasPerformance = hasActivity || Boolean(aaModel);

    const avgP50 =
      hourlyStats.length > 0
        ? Math.round(
            hourlyStats.reduce((s, r) => s + (r.p50_ms || 0), 0) / hourlyStats.length,
          )
        : 0;

    const avgP95 =
      hourlyStats.length > 0
        ? Math.round(
            hourlyStats.reduce((s, r) => s + (r.p95_ms || 0), 0) / hourlyStats.length,
          )
        : 0;

    const medianTtftMs =
      avgP50 > 0
        ? avgP50
        : aaModel?.median_time_to_first_token_seconds
          ? Math.round(aaModel.median_time_to_first_token_seconds * 1000)
          : 0;

    const medianTokensPerSecond =
      jobPerfStats.avgTps != null
        ? Math.round(jobPerfStats.avgTps)
        : aaModel?.median_output_tokens_per_second
          ? Math.round(aaModel.median_output_tokens_per_second)
          : 0;

    const qualityScore = aaModel?.artificial_analysis_intelligence_index
      ? Number((aaModel.artificial_analysis_intelligence_index as number).toFixed(1))
      : 0;

    const latencySeries = hourlyStats.map((row, idx) => ({
      bucket: `H${idx + 1}`,
      p50: Math.round(row.p50_ms || 0),
      p95: Math.round(row.p95_ms || 0),
    }));

    const benchmarkRadar = aaModel
      ? [
          {
            metric: 'Intelligence',
            score: Number(((aaModel.artificial_analysis_intelligence_index as number) ?? 0).toFixed(1)),
          },
          {
            metric: 'Coding',
            score: Number(((aaModel.coding_index as number) ?? 0).toFixed(1)),
          },
          {
            metric: 'Math',
            score: Number(((aaModel.math_index as number) ?? 0).toFixed(1)),
          },
        ]
      : [];

    const performance: ModelDetailViewModel['performance'] = {
      summary: {
        medianTtftMs,
        medianTokensPerSecond,
        p95LatencyMs: avgP95,
        qualityScore,
      },
      latencySeries,
      benchmarkRadar,
      ...(jobPerfStats.avgCpuPercent != null && { avgCpuPercent: Number(jobPerfStats.avgCpuPercent.toFixed(1)) }),
      ...(jobPerfStats.avgRamMb != null && { avgRamMb: Number(jobPerfStats.avgRamMb.toFixed(0)) }),
    };

    // ─── Providers (from DB providers table) ──────────────────────────────────

    const hasProviders = dbProviders.length > 0;

    const sharePerProvider = dbProviders.length > 0 ? 100 / dbProviders.length : 0;

    const distribution = dbProviders.map((p) => ({
      provider: p.id,
      share: Number(sharePerProvider.toFixed(1)),
      p95LatencyMs: avgP95,
      availability: currentPercent,
    }));

    const endpoints = dbProviders.map((p) => ({
      endpoint: p.id,
      region: 'Global',
      status: (
        currentPercent >= 99.2
          ? 'healthy'
          : currentPercent >= 98.2
            ? 'degraded'
            : currentPercent > 0
              ? 'unstable'
              : 'healthy'
      ) as 'healthy' | 'degraded' | 'unstable',
      uptime: currentPercent,
      throughputRps: 0,
    }));

    const providers: ModelDetailViewModel['providers'] = {
      distribution,
      endpoints,
      zkaiProviders: dbProviders.map((p) => ({
        id: p.id,
        endpoint: p.endpoint,
        price: p.price,
        reputation: p.reputation,
        hardware: p.hardware,
        avgLatencyMs: p.avg_latency_ms ?? null,
      })),
    };

    // ─── API (static template) ────────────────────────────────────────────────

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.zkai.io/v1';

    const api: ModelDetailViewModel['api'] = {
      baseUrl,
      endpoints: [
        {
          method: 'POST',
          path: '/chat/completions',
          description: 'Run inference via OpenAI-compatible schema.',
        },
        {
          method: 'GET',
          path: '/models',
          description: 'List available models and metadata.',
        },
      ],
      sampleRequest: `curl -X POST ${baseUrl}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -d '{
    "model": "${slug}",
    "messages": [{"role":"user","content":"Hello"}],
    "temperature": 0.7
  }'`,
      sampleResponse: `{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "model": "${slug}",
  "choices": [
    {
      "index": 0,
      "finish_reason": "stop",
      "message": {
        "role": "assistant",
        "content": "Hello! How can I assist you today?"
      }
    }
  ]
}`,
    };

    // ─── Compose final view model ─────────────────────────────────────────────

    const hasORPerf =
      orPerfStats.throughput.length > 0 ||
      orPerfStats.latency.length > 0 ||
      orPerfStats.latencyE2e.length > 0;

    const hasORBenchmarks =
      orBenchmarkData.aaBenchmarks.length > 0 ||
      orBenchmarkData.designArena.length > 0;

    const hasORAppsActivity =
      orAppsActivityData.activitySeries.length > 0 ||
      orAppsActivityData.topApps.length > 0;

    const hasORUptime = orUptimeData.providers.length > 0 || Boolean(orUptimeData.uptimeGraphUrl);

    const viewModel: ModelDetailViewModel = {
      hero,
      price,
      uptime,
      providers,
      performance,
      activity,
      api,
      ...(hasORPerf && {
        orPerformance: {
          permaslug: orPerfStats.permaslug,
          throughput: orPerfStats.throughput,
          latency: orPerfStats.latency,
          latencyE2e: orPerfStats.latencyE2e,
          toolCallErrorRate: orPerfStats.toolCallErrorRate,
          structuredOutputErrorRate: orPerfStats.structuredOutputErrorRate,
        },
      }),
      ...(hasORBenchmarks && {
        orBenchmarks: {
          slug,
          aaBenchmarks: orBenchmarkData.aaBenchmarks,
          designArena: orBenchmarkData.designArena,
          ...(orBenchmarkData.eloBounds && { eloBounds: orBenchmarkData.eloBounds }),
        },
      }),
      ...(hasORAppsActivity && {
        orAppsActivity: {
          slug,
          activitySeries: orAppsActivityData.activitySeries,
          topApps: orAppsActivityData.topApps,
        },
      }),
      ...(hasORUptime && {
        orUptime: {
          slug,
          providers: orUptimeData.providers,
          ...(orUptimeData.uptimeGraphUrl && { uptimeGraphUrl: orUptimeData.uptimeGraphUrl }),
          ...(orUptimeData.comparisonGraphUrl && { comparisonGraphUrl: orUptimeData.comparisonGraphUrl }),
          ...(orUptimeData.finishReasonGraphUrl && { finishReasonGraphUrl: orUptimeData.finishReasonGraphUrl }),
        },
      }),
      hasRealData: {
        price: true,
        activity: hasActivity,
        uptime: hasUptime,
        performance: hasPerformance,
        providers: hasProviders,
        apps: false,
      },
    };

    return NextResponse.json({ data: viewModel });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
