import { NextResponse } from 'next/server';
import {
  fetchOpenRouterModels,
  fetchArtificialAnalysis,
  fetchInternalProviders,
  fetchLatencyStats,
  matchProvider,
  matchAAModel,
  transformModel,
} from '@/lib/data/model-fetchers';

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
