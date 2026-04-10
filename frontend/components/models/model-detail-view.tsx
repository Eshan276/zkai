"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Cpu,
  HardDrive,
  MemoryStick,
  Shield,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Navigation } from "@/components/navigation";
import { cn } from "@/lib/utils";
import type { ModelDetailViewModel, ORPerformanceStats, ORPerfPoint } from "@/lib/types/model-detail";

type SectionId = "pricing" | "providers" | "performance" | "benchmarks" | "apps" | "activity" | "uptime" | "api";

const sectionItems: { id: SectionId; label: string }[] = [
  { id: "pricing", label: "Pricing" },
  { id: "providers", label: "Providers" },
  { id: "performance", label: "Performance" },
  { id: "benchmarks", label: "Benchmarks" },
  { id: "apps", label: "Apps" },
  { id: "activity", label: "Activity" },
  { id: "uptime", label: "Uptime" },
  { id: "api", label: "API" },
];

const PIE_COLORS = ["#5eead4", "#22d3ee", "#f59e0b", "#fb7185"];

const tooltipStyle = {
  backgroundColor: "rgba(10, 14, 20, 0.96)",
  border: "1px solid rgba(148, 163, 184, 0.15)",
  borderRadius: "6px",
  color: "#e2e8f0",
  fontSize: "12px",
};

function formatContextLength(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return `${value}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatUsd(value: number): string {
  if (value === 0) return "Free";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(2)}`;
}

function buildPricingTrend(
  trend: Array<{ day: string; input: number; output: number; effective: number }>,
  inputPerM: number,
  outputPerM: number,
  effectivePerM: number,
) {
  if (trend.length > 0) {
    return trend.slice(-7).map((point, idx) => ({
      day: point.day || `Day ${idx + 1}`,
      input: point.input,
      output: point.output,
      effective: point.effective,
    }));
  }

  const days = Array.from({ length: 7 }, (_, idx) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - idx));
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  return days.map((day) => ({
    day,
    input: inputPerM,
    output: outputPerM,
    effective: effectivePerM,
  }));
}

function SectionHeading({ title, live }: { title: string; live?: boolean }) {
  return (
    <div className="mb-7 flex items-center justify-between">
      <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
      {live !== undefined && (
        live ? (
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            Live
          </span>
        ) : (
          <span className="text-[11px] text-slate-600">Estimated</span>
        )
      )}
    </div>
  );
}

function EmptyState({ message = "No data available." }: { message?: string }) {
  return (
    <p className="py-10 text-center text-sm text-slate-500">{message}</p>
  );
}

function StatRow({ stats }: { stats: { label: string; value: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-5">
      {stats.map((s) => (
        <div key={s.label}>
          <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">{s.label}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-white">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── OpenRouter performance helpers ──────────────────────────────────────────

/**
 * Flatten OR time-series data into chart-friendly rows.
 * Each point has `x` (date string) and `y` (map of endpointId → value).
 * We merge all endpoint values into a single average per date for simplicity.
 */
function flattenORSeries(points: ORPerfPoint[]): Array<{ date: string; value: number }> {
  return points.map((p) => {
    const vals = Object.values(p.y);
    const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    return {
      date: p.x.split(' ')[0],
      value: Number(avg.toFixed(2)),
    };
  });
}

function ORChart({
  data,
  label,
  color,
  unit,
  formatter,
}: {
  data: ORPerfPoint[];
  label: string;
  color: string;
  unit?: string;
  formatter?: (v: number) => string;
}) {
  const series = flattenORSeries(data);
  if (series.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <p className="mb-3 text-sm text-slate-400">{label}</p>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={44}
              tickFormatter={formatter}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v) => {
                const n = typeof v === 'number' ? v : Number(v);
                return [formatter ? formatter(n) : `${n}${unit ? ` ${unit}` : ''}`, label];
              }}
            />
            <Line type="monotone" dataKey="value" name={label} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function latestAvg(points: ORPerfPoint[]): number | null {
  if (points.length === 0) return null;
  const last = points[points.length - 1];
  const vals = Object.values(last.y);
  if (vals.length === 0) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function ORPerformanceSection({ data }: { data: ORPerformanceStats }) {
  const avgThroughput = latestAvg(data.throughput);
  const avgLatency = latestAvg(data.latency);
  const avgE2eLatency = latestAvg(data.latencyE2e);
  const avgToolErr = latestAvg(data.toolCallErrorRate);
  const avgStructErr = latestAvg(data.structuredOutputErrorRate);

  const summaryStats = [
    avgThroughput != null && { label: "Throughput", value: `${avgThroughput.toFixed(0)} tok/s` },
    avgLatency != null && { label: "TTFT (avg)", value: `${(avgLatency / 1000).toFixed(2)} s` },
    avgE2eLatency != null && { label: "E2E Latency", value: `${(avgE2eLatency / 1000).toFixed(2)} s` },
    avgToolErr != null && { label: "Tool Call Err", value: `${avgToolErr.toFixed(2)}%` },
    avgStructErr != null && { label: "Struct. Output Err", value: `${avgStructErr.toFixed(2)}%` },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="space-y-6">
      {summaryStats.length > 0 && <StatRow stats={summaryStats} />}

      <p className="text-[11px] text-slate-600">
        Source: OpenRouter · data shown is daily average across all providers
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <ORChart
          data={data.throughput}
          label="Throughput (tok/s)"
          color="#2dd4bf"
          unit="tok/s"
          formatter={(v) => `${v.toFixed(0)}`}
        />
        <ORChart
          data={data.latency}
          label="TTFT Latency (ms)"
          color="#22d3ee"
          unit="ms"
          formatter={(v) => `${v.toFixed(0)}`}
        />
        <ORChart
          data={data.latencyE2e}
          label="E2E Latency (ms)"
          color="#a78bfa"
          unit="ms"
          formatter={(v) => `${v.toFixed(0)}`}
        />
        <ORChart
          data={data.toolCallErrorRate}
          label="Tool Call Error Rate (%)"
          color="#fb7185"
          unit="%"
          formatter={(v) => `${v.toFixed(2)}%`}
        />
        {data.structuredOutputErrorRate.length > 0 && (
          <ORChart
            data={data.structuredOutputErrorRate}
            label="Structured Output Error Rate (%)"
            color="#f59e0b"
            unit="%"
            formatter={(v) => `${v.toFixed(2)}%`}
          />
        )}
      </div>
    </div>
  );
}

export function ModelDetailView({ model }: { model: ModelDetailViewModel }) {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("pricing");

  const copySlug = async () => {
    try {
      await navigator.clipboard.writeText(model.hero.slug);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const pricingTrend = model.price
    ? buildPricingTrend(
        model.price.trend,
        model.price.inputPerM,
        model.price.outputPerM,
        model.price.effectivePerM,
      )
    : [];

  const shareByProvider = new Map(
    (model.providers?.distribution ?? []).map((row) => [row.provider, row.share]),
  );

  const providerRows =
    model.providers?.zkaiProviders && model.providers.zkaiProviders.length > 0
      ? model.providers.zkaiProviders.map((provider) => ({
          provider: provider.id,
          inputPerM: model.price?.inputPerM ?? 0,
          outputPerM: model.price?.outputPerM ?? 0,
          share: shareByProvider.get(provider.id),
        }))
      : model.price
        ? [
            {
              provider: "Default route",
              inputPerM: model.price.inputPerM,
              outputPerM: model.price.outputPerM,
              share: 100,
            },
          ]
        : [];

  return (
    <>
      <Navigation />
      <div className="relative mx-auto w-full max-w-4xl px-4 pb-24 pt-28 sm:px-6">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="pb-10">
        {/* Breadcrumb */}
        <p className="mb-5 text-xs tracking-wide text-slate-500">
          {model.hero.provider} / {model.hero.name}
        </p>

        {/* Title */}
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {model.hero.name}
        </h1>

        {/* Slug + copy */}
        <div className="mt-3 flex items-center gap-2">
          <span className="font-mono text-sm text-slate-400">{model.hero.slug}</span>
          <button
            onClick={copySlug}
            className="text-slate-600 transition hover:text-slate-300"
            aria-label="Copy model ID"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Release info */}
        <p className="mt-1.5 text-xs text-slate-500">
          Released {model.hero.lastUpdated} · {formatContextLength(model.hero.contextLength)} context ·{" "}
          {model.hero.isFree ? "Free" : `${model.hero.inputPrice} input · ${model.hero.outputPrice} output`}
        </p>

        {/* Description */}
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-300/90">
          {model.hero.description}
        </p>

        {/* Badges */}
        <div className="mt-5 flex flex-wrap gap-2">
          {model.hero.modalities.map((mode) => (
            <span key={mode} className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-300">
              {mode}
            </span>
          ))}
          {model.hero.supportsReasoning && (
            <span className="inline-flex items-center gap-1 rounded-md border border-violet-400/30 bg-violet-400/[0.06] px-2.5 py-1 text-[11px] font-medium text-violet-300">
              <Sparkles className="h-2.5 w-2.5" /> Reasoning
            </span>
          )}
          {model.hero.isNew && (
            <span className="rounded-md border border-sky-400/30 bg-sky-400/[0.06] px-2.5 py-1 text-[11px] font-medium text-sky-300">New</span>
          )}
          {model.hero.isFree && (
            <span className="rounded-md border border-amber-400/30 bg-amber-400/[0.06] px-2.5 py-1 text-[11px] font-medium text-amber-300">Free</span>
          )}
          {model.hero.tags.map((tag) => (
            <span key={tag} className="rounded-md border border-white/8 px-2.5 py-1 text-[11px] text-slate-500">
              {tag}
            </span>
          ))}
        </div>

      </section>

      {/* ── Tab Nav ───────────────────────────────────────────── */}
      <div className="sticky top-[72px] z-30 -mx-4 bg-transparent sm:-mx-6">
        <div className="mx-auto flex max-w-4xl gap-0 overflow-x-auto px-4 sm:px-6">
          {sectionItems.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              aria-pressed={activeSection === item.id}
              className={cn(
                "shrink-0 border-b-2 px-4 py-3.5 text-sm font-medium transition-colors",
                activeSection === item.id
                  ? "border-teal-400 text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sections ─────────────────────────────────────────── */}
      <div className="divide-y divide-white/[0.07]">

        {/* ── Pricing ── */}
        <section className={cn("py-10", activeSection === "pricing" ? "block" : "hidden")}>
          <SectionHeading title="Pricing" live={model.hasRealData.price} />

          {model.price ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
                <h3 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  Effective Pricing For {model.hero.name}
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Estimated cost per million tokens across active routes over the past 7 days.
                </p>

                <div className="mt-6">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                    Weighted Average
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5">
                      <p className="text-sm text-slate-400">Weighted Avg Input Price</p>
                      <p className="mt-1 text-4xl font-semibold tracking-tight text-white">
                        {formatUsd(model.price.inputPerM)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">per 1M tokens</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5">
                      <p className="text-sm text-slate-400">Weighted Avg Output Price</p>
                      <p className="mt-1 text-4xl font-semibold tracking-tight text-white">
                        {formatUsd(model.price.outputPerM)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">per 1M tokens</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.08]">
                  <div className="grid grid-cols-[minmax(140px,1.6fr)_1fr_1fr_0.9fr] gap-3 border-b border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-xs uppercase tracking-[0.08em] text-slate-500">
                    <span>Provider</span>
                    <span className="text-right">Input $/1M</span>
                    <span className="text-right">Output $/1M</span>
                    <span className="text-right">Traffic</span>
                  </div>
                  <div className="divide-y divide-white/[0.06]">
                    {providerRows.map((row) => (
                      <div
                        key={row.provider}
                        className="grid grid-cols-[minmax(140px,1.6fr)_1fr_1fr_0.9fr] gap-3 px-4 py-3 text-sm"
                      >
                        <p className="truncate text-white">{row.provider}</p>
                        <p className="text-right text-slate-200">{formatUsd(row.inputPerM)}</p>
                        <p className="text-right text-slate-200">{formatUsd(row.outputPerM)}</p>
                        <p className="text-right text-slate-400">
                          {typeof row.share === "number" ? `${row.share.toFixed(1)}%` : "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-2 text-[11px] text-slate-500">
                  Provider rows use current model-level token rates while traffic share comes from observed routing distribution.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <p className="mb-3 text-sm text-slate-400">Input Price / 1M tokens (7 days)</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={pricingTrend} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="input" name="Input" stroke="#22d3ee" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <p className="mb-3 text-sm text-slate-400">Output Price / 1M tokens (7 days)</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={pricingTrend} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="output" name="Output" stroke="#2dd4bf" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState message="Pricing data unavailable for this model." />
          )}
        </section>

        {/* ── Providers ── */}
        <section className={cn("py-10", activeSection === "providers" ? "block" : "hidden")}>
          <SectionHeading title="Providers" live={model.hasRealData.providers} />

          {model.providers ? (
            <div className="space-y-8">
              {/* zkAI internal providers */}
              {model.providers.zkaiProviders && model.providers.zkaiProviders.length > 0 && (
                <div>
                  <p className="mb-3 flex items-center gap-1.5 text-xs text-teal-300">
                    <Shield className="h-3 w-3" /> zkAI Providers
                  </p>
                  <div className="space-y-3">
                    {model.providers.zkaiProviders.map((provider) => {
                      const hw = provider.hardware as Record<string, unknown> | undefined;
                      const cpuModel = hw?.cpu_model as string | undefined;
                      const cpuCores = hw?.cpu_cores as number | undefined;
                      const ramMb = hw?.ram_total_mb as number | undefined;
                      const gpu = hw?.gpu as string | undefined;
                      const hasHardware = cpuModel || cpuCores != null || ramMb != null || gpu;
                      return (
                        <div key={provider.id} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
                          {/* Top row: endpoint + stats */}
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate font-mono text-sm text-white">{provider.endpoint}</p>
                              <p className="mt-0.5 font-mono text-[10px] text-slate-600 truncate">ID: {provider.id}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-5 text-right">
                              <div>
                                <p className="text-[11px] text-slate-500">Price / req</p>
                                <p className="text-sm text-white">{provider.price} <span className="text-xs text-slate-500">tNIGHT</span></p>
                              </div>
                              {provider.avgLatencyMs != null && (
                                <div>
                                  <p className="text-[11px] text-slate-500">Avg latency</p>
                                  <p className="text-sm text-white">
                                    {provider.avgLatencyMs >= 1000
                                      ? `${(provider.avgLatencyMs / 1000).toFixed(1)}s`
                                      : `${provider.avgLatencyMs}ms`}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="text-[11px] text-slate-500">Reputation</p>
                                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                  <div className="h-1 w-12 rounded-full bg-white/10 overflow-hidden">
                                    <div className="h-full bg-teal-400 rounded-full" style={{ width: `${Math.round(provider.reputation * 100)}%` }} />
                                  </div>
                                  <p className="text-sm text-white">{(provider.reputation * 100).toFixed(0)}%</p>
                                </div>
                              </div>
                              {provider.uptime !== undefined && (
                                <div>
                                  <p className="text-[11px] text-slate-500">Uptime</p>
                                  <p className="text-sm text-emerald-300">{(provider.uptime * 100).toFixed(1)}%</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Hardware details */}
                          {hasHardware && (
                            <div className="border-t border-white/[0.06] pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {cpuModel && (
                                <div className="sm:col-span-2 flex items-start gap-2">
                                  <Cpu className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-600" />
                                  <div>
                                    <p className="text-[10px] uppercase tracking-[0.1em] text-slate-600">CPU</p>
                                    <p className="text-xs text-slate-300 mt-0.5 leading-snug">{cpuModel}</p>
                                  </div>
                                </div>
                              )}
                              {cpuCores != null && (
                                <div className="flex items-start gap-2">
                                  <HardDrive className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-600" />
                                  <div>
                                    <p className="text-[10px] uppercase tracking-[0.1em] text-slate-600">Cores</p>
                                    <p className="text-xs text-slate-300 mt-0.5">{cpuCores}</p>
                                  </div>
                                </div>
                              )}
                              {ramMb != null && (
                                <div className="flex items-start gap-2">
                                  <MemoryStick className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-600" />
                                  <div>
                                    <p className="text-[10px] uppercase tracking-[0.1em] text-slate-600">RAM</p>
                                    <p className="text-xs text-slate-300 mt-0.5">
                                      {ramMb >= 1024 ? `${(ramMb / 1024).toFixed(1)} GB` : `${ramMb} MB`}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {gpu && (
                                <div className="sm:col-span-2 flex items-start gap-2">
                                  <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-600" />
                                  <div>
                                    <p className="text-[10px] uppercase tracking-[0.1em] text-slate-600">GPU</p>
                                    <p className="text-xs text-slate-300 mt-0.5">{gpu}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Endpoints */}
              <div>
                <p className="mb-3 text-xs text-slate-500">Endpoints</p>
                <div className="divide-y divide-white/6">
                  {model.providers.endpoints.map((endpoint) => (
                    <div key={endpoint.endpoint} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm text-white">{endpoint.endpoint}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{endpoint.region}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-5 text-right">
                        <div>
                          <p className="text-[11px] text-slate-500">Uptime</p>
                          <p className="text-sm text-white">{endpoint.uptime.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500">Throughput</p>
                          <p className="text-sm text-white">{endpoint.throughputRps} req/s</p>
                        </div>
                        <span
                          className={cn(
                            "text-[11px]",
                            endpoint.status === "healthy" && "text-emerald-400",
                            endpoint.status === "degraded" && "text-amber-400",
                            endpoint.status === "unstable" && "text-rose-400",
                          )}
                        >
                          {endpoint.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Traffic share chart */}
              <div>
                <p className="mb-3 text-xs text-slate-500">Traffic share by provider</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={model.providers.distribution} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                      <XAxis dataKey="provider" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="share" name="Share %" fill="#5eead4" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState message="No active providers registered for this model." />
          )}
        </section>

        {/* ── Performance ── */}
        <section className={cn("py-10", activeSection === "performance" ? "block" : "hidden")}>
          <SectionHeading title="Performance" live={model.hasRealData.performance} />

          {model.orPerformance ? (
            <ORPerformanceSection data={model.orPerformance} />
          ) : (
            /* TODO: replace with our own telemetry endpoint when available */
            <EmptyState message="No performance data recorded for this model yet." />
          )}

          {/* ── zkAI internal performance (commented out until our telemetry endpoint is ready) ──
          {model.performance ? (
            <>
              <StatRow
                stats={[
                  { label: "Median TTFT", value: model.performance.summary.medianTtftMs > 0 ? `${model.performance.summary.medianTtftMs} ms` : "—" },
                  { label: "Tok / sec", value: model.performance.summary.medianTokensPerSecond > 0 ? `${model.performance.summary.medianTokensPerSecond}` : "—" },
                  { label: "P95 Latency", value: model.performance.summary.p95LatencyMs > 0 ? `${model.performance.summary.p95LatencyMs} ms` : "—" },
                  { label: "Quality Index", value: model.performance.summary.qualityScore > 0 ? `${model.performance.summary.qualityScore}` : "—" },
                ]}
              />

              {(model.performance.avgCpuPercent != null || model.performance.avgRamMb != null) && (
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {model.performance.avgCpuPercent != null && (
                    <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-4 py-3.5 flex items-start gap-2.5">
                      <Cpu className="h-4 w-4 mt-0.5 shrink-0 text-slate-500" />
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Avg CPU</p>
                        <p className="mt-1 text-xl font-semibold tracking-tight text-white">{model.performance.avgCpuPercent.toFixed(1)}%</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">per request</p>
                      </div>
                    </div>
                  )}
                  {model.performance.avgRamMb != null && (
                    <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-4 py-3.5 flex items-start gap-2.5">
                      <MemoryStick className="h-4 w-4 mt-0.5 shrink-0 text-slate-500" />
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Avg RAM</p>
                        <p className="mt-1 text-xl font-semibold tracking-tight text-white">
                          {model.performance.avgRamMb >= 1024
                            ? `${(model.performance.avgRamMb / 1024).toFixed(1)} GB`
                            : `${Math.round(model.performance.avgRamMb)} MB`}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-0.5">per request</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8">
                <p className="mb-3 text-xs text-slate-500">Latency under load</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={model.performance.latencySeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                      <XAxis dataKey="bucket" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                      <Line type="monotone" dataKey="p50" name="P50" stroke="#2dd4bf" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="p95" name="P95" stroke="#fb7185" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <EmptyState message="No performance data recorded for this model yet." />
          )}
          ── end zkAI internal performance ── */}
        </section>

        {/* ── Benchmarks ── */}
        <section className={cn("py-10", activeSection === "benchmarks" ? "block" : "hidden")}>
          <SectionHeading title="Benchmarks" live={model.hasRealData.performance} />

          {model.performance && model.performance.benchmarkRadar && model.performance.benchmarkRadar.length > 0 ? (
            <div>
              <p className="mb-3 text-xs text-slate-500">Capability radar</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={model.performance.benchmarkRadar}>
                    <PolarGrid stroke="rgba(148,163,184,0.12)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <PolarRadiusAxis domain={[40, 100]} tick={{ fill: "#64748b", fontSize: 9 }} />
                    <Radar dataKey="score" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.25} />
                    <Tooltip contentStyle={tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <EmptyState message="No benchmark data available." />
          )}
        </section>

        {/* ── Apps ── */}
        <section className={cn("py-10", activeSection === "apps" ? "block" : "hidden")}>
          <SectionHeading title="Apps" live={model.hasRealData.apps} />

          {model.hasRealData.apps && model.apps ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-xs text-slate-500">Weekly adoption</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={model.apps.adoptionSeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="appsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                      <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                      <Area yAxisId="left" type="monotone" dataKey="apps" stroke="#22d3ee" fill="url(#appsGrad)" name="Apps" strokeWidth={1.5} />
                      <Line yAxisId="right" type="monotone" dataKey="requestsK" stroke="#f59e0b" name="Requests (K)" strokeWidth={1.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs text-slate-500">Top apps</p>
                <div className="divide-y divide-white/6">
                  {model.apps.topApps.map((app) => (
                    <div key={app.name} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm text-white">{app.name}</p>
                        <p className="text-xs text-slate-500">{app.category} · {app.calls}</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <TrendingUp className="h-3 w-3" />
                        +{app.growthPercent}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState message="No app-level data available yet." />
          )}
        </section>

        {/* ── Activity ── */}
        <section className={cn("py-10", activeSection === "activity" ? "block" : "hidden")}>
          <SectionHeading title="Activity" live={model.hasRealData.activity} />

          {model.activity && model.hasRealData.activity ? (
            <>
              <StatRow
                stats={[
                  { label: "Requests (24h)", value: formatNumber(model.activity.requests24h) },
                  {
                    label: "Peak Hour",
                    value: `${formatNumber(Math.max(...model.activity.requestSeries.map((p) => p.requests)))} req`,
                  },
                  {
                    label: "Avg Success",
                    value: `${(
                      model.activity.requestSeries.reduce((s, p) => s + p.successRate, 0) /
                      model.activity.requestSeries.length
                    ).toFixed(2)}%`,
                  },
                ]}
              />

              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-3 text-xs text-slate-500">Hourly request trend</p>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={model.activity.requestSeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="hour" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
                        <YAxis yAxisId="left" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" domain={[95, 100]} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                        <Line yAxisId="left" dataKey="requests" stroke="#22d3ee" strokeWidth={1.5} dot={false} name="Requests" />
                        <Line yAxisId="right" dataKey="successRate" stroke="#2dd4bf" strokeWidth={1.5} dot={false} name="Success %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs text-slate-500">Operation mix</p>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={model.activity.operationMix}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={78}
                          paddingAngle={2}
                        >
                          {model.activity.operationMix.map((entry, idx) => (
                            <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <EmptyState message="No activity data yet. Data appears once requests are routed through zkAI." />
          )}
        </section>

        {/* ── Uptime ── */}
        <section className={cn("py-10", activeSection === "uptime" ? "block" : "hidden")}>
          <SectionHeading title="Uptime" live={model.hasRealData.uptime} />

          {model.uptime && model.hasRealData.uptime ? (
            <>
              <StatRow
                stats={[
                  { label: "Current Uptime", value: `${model.uptime.currentPercent.toFixed(2)}%` },
                  { label: "Incidents (30d)", value: `${model.uptime.incidentCount30d}` },
                  { label: "Best Region", value: model.uptime.regions?.[0]?.region ?? "—" },
                  {
                    label: "Avg Latency",
                    value:
                      model.uptime.regions && model.uptime.regions.length > 0
                        ? `${Math.round(model.uptime.regions.reduce((s, r) => s + r.latencyMs, 0) / model.uptime.regions.length)} ms`
                        : "—",
                  },
                ]}
              />

              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-3 text-xs text-slate-500">24-hour uptime timeline</p>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={model.uptime.timeline} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="hour" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
                        <YAxis yAxisId="left" domain={[95, 100]} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 2.8]} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                        <Line yAxisId="left" type="monotone" dataKey="uptime" stroke="#34d399" strokeWidth={1.5} dot={false} name="Uptime %" />
                        <Line yAxisId="right" type="monotone" dataKey="errorRate" stroke="#fb7185" strokeWidth={1.5} dot={false} name="Error %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs text-slate-500">Regional reliability</p>
                  {model.uptime.regions && model.uptime.regions.length > 0 ? (
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={model.uptime.regions} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                          <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} domain={[95, 100]} />
                          <YAxis type="category" dataKey="region" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={90} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="uptime" name="Uptime %" fill="#2dd4bf" radius={[0, 3, 3, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyState message="No regional breakdown available." />
                  )}
                </div>
              </div>
            </>
          ) : (
            <EmptyState message="No uptime data yet. Data appears once requests are routed through zkAI providers." />
          )}
        </section>

        {/* ── API ── */}
        <section className={cn("py-10", activeSection === "api" ? "block" : "hidden")}>
          <SectionHeading title="API" />

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              {/* Base URL */}
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-[0.1em] text-slate-500">Base URL</p>
                <p className="font-mono text-sm text-teal-300">{model.api.baseUrl}</p>
              </div>

              {/* Endpoints */}
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.1em] text-slate-500">Endpoints</p>
                <div className="divide-y divide-white/6">
                  {model.api.endpoints.map((endpoint) => (
                    <div key={endpoint.path} className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-[11px] font-semibold",
                            endpoint.method === "POST" ? "text-cyan-400" : "text-emerald-400",
                          )}
                        >
                          {endpoint.method}
                        </span>
                        <span className="font-mono text-sm text-white">{endpoint.path}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{endpoint.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model ID */}
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-[0.1em] text-slate-500">Model ID</p>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm text-teal-300">{model.hero.slug}</code>
                  <button
                    onClick={copySlug}
                    className="text-slate-500 transition hover:text-slate-300"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.1em] text-slate-500">Sample Request</p>
                <pre className="overflow-x-auto rounded border border-white/8 bg-white/[0.03] p-4 text-xs leading-relaxed text-slate-300">
                  <code>{model.api.sampleRequest}</code>
                </pre>
              </div>
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.1em] text-slate-500">Sample Response</p>
                <pre className="overflow-x-auto rounded border border-white/8 bg-white/[0.03] p-4 text-xs leading-relaxed text-slate-300">
                  <code>{model.api.sampleResponse}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

      </div>
      </div>
    </>
  );
}
