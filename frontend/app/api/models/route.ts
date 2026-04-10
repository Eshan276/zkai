import { NextResponse } from 'next/server';
import {
  fetchOpenRouterModels,
  fetchArtificialAnalysis,
  fetchInternalProviders,
  fetchLatencyStats,
  matchProvider,
  matchAAModel,
  transformModel,
  synthesizeProviderModel,
} from '@/lib/data/model-fetchers';

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const providers = await fetchInternalProviders();

    if (providers.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const [orModels, aaModels, latencyStats] = await Promise.all([
      fetchOpenRouterModels(),
      fetchArtificialAnalysis(),
      fetchLatencyStats(),
    ]);

    // Models that have a matching OpenRouter entry — enriched with OR metadata
    const orMatched = orModels
      .filter((m) => !m.hidden && matchProvider(providers, m))
      .map((orModel) =>
        transformModel(
          orModel,
          matchProvider(providers, orModel),
          matchAAModel(aaModels, orModel),
          latencyStats,
        ),
      );

    // Providers whose model has NO OpenRouter entry — synthesize a card
    const matchedProviderIds = new Set(
      orMatched.map((m) => m.zkaiProvider).filter(Boolean),
    );
    const unmatched = providers.filter((p) => !matchedProviderIds.has(p.id));
    const synthetic = unmatched.map((p) => synthesizeProviderModel(p, latencyStats));

    return NextResponse.json({ data: [...orMatched, ...synthetic] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
