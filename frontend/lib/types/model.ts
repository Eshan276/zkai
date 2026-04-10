/**
 * Unified model shape returned by /api/models and consumed by the frontend.
 * Core fields come from OpenRouter; optional overrides and enrichments come
 * from the internal DB and Artificial Analysis.
 */
export interface MergedModel {
  /** OpenRouter slug, e.g. "qwen/qwen-2.5-72b-instruct" — used as stable key */
  id: string;
  name: string;
  /** Author/creator display name, e.g. "Qwen", "Google" */
  provider: string;
  /** Author slug, e.g. "qwen" */
  author: string;
  description: string;
  contextLength: number;
  /** $ per 1M input tokens (numeric, for sorting/filtering) */
  inputPriceRaw: number;
  /** Formatted input price, e.g. "$0.12" */
  inputPrice: string;
  /** Formatted output price, e.g. "$0.36" */
  outputPrice: string;
  /** Parameter count label extracted from name, e.g. "72B" */
  tokens: string;
  /** "text" | "image" | "audio" | "video" | "multimodal" */
  category: string;
  /** Capitalised input modalities, e.g. ["Text", "Image"] */
  modalities: string[];
  /** Model family/group, e.g. ["Qwen"] */
  series: string[];
  /** Capability tags, e.g. ["Coding", "Function Calling", "Vision"] */
  categories: string[];
  supportedParams: string[];
  distillable: boolean;
  isNew: boolean;
  isFree: boolean;
  isOpenSource: boolean;
  /** Formatted creation date, e.g. "Apr 3, 2026" */
  date: string;

  // ── Internal provider overrides (when matched to an active zkAI provider) ──
  zkaiProvider?: string;
  zkaiPrice?: number;
  zkaiHardware?: Record<string, unknown>;
  zkaiLatencyMs?: number;
  zkaiUptime?: number;

  // ── Benchmark enrichment from Artificial Analysis ─────────────────────────
  benchmarks?: {
    intelligenceIndex?: number;
    codingIndex?: number;
    mathIndex?: number;
    medianOutputTokensPerSecond?: number;
    medianTimeToFirstTokenSeconds?: number;
  };
}
