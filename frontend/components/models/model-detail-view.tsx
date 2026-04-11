"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Cpu,
  HardDrive,
  KeyRound,
  MemoryStick,
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
import type { ModelDetailViewModel, ORPerformanceStats, ORPerfPoint, ORBenchmarkData, ORAAbenchmarkEntry, ORDesignArenaRecord, ORAppsActivityData, ORUptimeData } from "@/lib/types/model-detail";

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

// ─── OpenRouter activity / apps section ──────────────────────────────────────

function formatTokenCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

function formatTokensFromString(s: string): string {
  return formatTokenCount(parseInt(s, 10) || 0);
}

function ORActivitySection({ data }: { data: ORAppsActivityData }) {
  const sorted = [...data.activitySeries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const chartData = sorted.map((d) => ({
    date: d.date.split(" ")[0].slice(5),
    prompt: Math.round(d.total_prompt_tokens / 1_000_000),
    completion: Math.round(d.total_completion_tokens / 1_000_000),
    requests: d.count,
  }));

  const totalPrompt = sorted.reduce((s, d) => s + d.total_prompt_tokens, 0);
  const totalCompletion = sorted.reduce((s, d) => s + d.total_completion_tokens, 0);
  const totalRequests = sorted.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-8">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Prompt Tokens", value: formatTokenCount(totalPrompt) },
          { label: "Completion Tokens", value: formatTokenCount(totalCompletion) },
          { label: "Total Requests", value: formatNumber(totalRequests) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Stacked bar chart — prompt vs completion tokens per day */}
      {chartData.length > 0 && (
        <div>
          <p className="mb-3 text-xs text-slate-500">Daily token usage (millions)</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${v}M`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, name) => [`${v}M tokens`, name === "prompt" ? "Prompt" : "Completion"]}
                />
                <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} formatter={(v) => v === "prompt" ? "Prompt" : "Completion"} />
                <Bar dataKey="prompt" name="prompt" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="completion" name="completion" stackId="a" fill="#22d3ee" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Request count area chart */}
      {chartData.length > 0 && (
        <div>
          <p className="mb-3 text-xs text-slate-500">Daily request count</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatNumber(Number(v)), "Requests"]} />
                <Area type="monotone" dataKey="requests" stroke="#a78bfa" fill="url(#reqGrad)" strokeWidth={2} dot={false} name="Requests" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function ORAppsSection({ data }: { data: ORAppsActivityData }) {
  if (data.topApps.length === 0) {
    return <EmptyState message="No app usage data available for this model." />;
  }

  const maxTokens = parseInt(data.topApps[0]?.total_tokens ?? "1", 10) || 1;

  return (
    <div className="space-y-1">
      {data.topApps.map((app, idx) => {
        const tokens = parseInt(app.total_tokens, 10) || 0;
        const barWidth = Math.max(1, (tokens / maxTokens) * 100);
        const domain = app.app.origin_url
          ? (() => { try { return new URL(app.app.origin_url).hostname.replace(/^www\./, ''); } catch { return null; } })()
          : null;
        const subtitle = app.app.description
          ? app.app.description.length > 60
            ? app.app.description.slice(0, 60) + "…"
            : app.app.description
          : domain;

        return (
          <div key={app.app.id} className="group py-3.5">
            <div className="flex items-start gap-4">
              {/* Rank */}
              <span className="mt-0.5 w-4 shrink-0 text-[11px] font-medium text-slate-600 tabular-nums">
                {idx + 1}.
              </span>

              {/* Title + subtitle */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white leading-snug">{app.app.title}</p>
                {subtitle && (
                  <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">{subtitle}</p>
                )}
                {/* Token bar */}
                <div className="mt-2 h-[3px] w-full rounded-full bg-white/[0.06]">
                  <div
                    className="h-[3px] rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-slate-600">
                  {formatNumber(app.total_requests)} requests
                  {app.app.categories.length > 0 && (
                    <> · <span className="text-slate-500">{app.app.categories[0]}</span></>
                  )}
                </p>
              </div>

              {/* Token count */}
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-white tabular-nums">{formatTokensFromString(app.total_tokens)}</p>
                <p className="text-[10px] text-slate-600">tokens</p>
              </div>
            </div>

            {/* Divider — skip after last */}
            {idx < data.topApps.length - 1 && (
              <div className="mt-3.5 h-px bg-white/[0.05]" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── OpenRouter uptime section ────────────────────────────────────────────────

function ORUptimeSection({ data }: { data: ORUptimeData }) {
  // Build a unified date list across all providers
  const allDates = Array.from(
    new Set(data.providers.flatMap((p) => p.series.map((s) => s.date.split(" ")[0]))),
  ).sort();

  // Chart data: one row per date, one key per provider (shortened UUID)
  const providerIds = data.providers.map((p) => p.providerId);
  const chartData = allDates.map((date) => {
    const row: Record<string, string | number> = { date: date.slice(5) };
    for (const p of data.providers) {
      const point = p.series.find((s) => s.date.startsWith(date));
      row[p.providerId.slice(0, 8)] = point ? Number(point.uptime.toFixed(2)) : 0;
    }
    return row;
  });

  const UPTIME_COLORS = ["#22d3ee", "#a78bfa", "#34d399", "#fb7185", "#f59e0b"];

  // Compute average uptime per provider
  const providerAverages = data.providers.map((p) => {
    const avg = p.series.length > 0
      ? p.series.reduce((s, r) => s + r.uptime, 0) / p.series.length
      : 0;
    return { id: p.providerId, shortId: p.providerId.slice(0, 8), avg };
  });

  return (
    <div className="space-y-8">
      {/* Provider uptime averages */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {providerAverages.map((p, idx) => (
          <div
            key={p.id}
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: UPTIME_COLORS[idx % UPTIME_COLORS.length] }}
              />
              <p className="text-[10px] font-mono text-slate-500 truncate">{p.id.slice(0, 8)}…</p>
            </div>
            <p className="text-2xl font-semibold text-white">{p.avg.toFixed(2)}%</p>
            <p className="text-[10px] text-slate-500 mt-0.5">avg uptime</p>
          </div>
        ))}
      </div>

      {/* Multi-line uptime chart */}
      {chartData.length > 0 && (
        <div>
          <p className="mb-3 text-xs text-slate-500">Uptime by provider (%)</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={[98, 100]}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, name) => [`${v}%`, `Provider ${name}`]}
                />
                <Legend
                  wrapperStyle={{ color: "#94a3b8", fontSize: 10 }}
                  formatter={(v) => `Provider ${v}`}
                />
                {providerIds.map((id, idx) => (
                  <Line
                    key={id}
                    type="monotone"
                    dataKey={id.slice(0, 8)}
                    stroke={UPTIME_COLORS[idx % UPTIME_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4, fill: UPTIME_COLORS[idx % UPTIME_COLORS.length] }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── OpenRouter benchmark section ────────────────────────────────────────────

const AA_EVAL_LABELS: Record<string, string> = {
  artificial_analysis_intelligence_index: "Intelligence Index",
  artificial_analysis_coding_index: "Coding Index",
  artificial_analysis_agentic_index: "Agentic Index",
  gpqa: "GPQA",
  hle: "HLE",
  lcr: "LCR",
  ifbench: "IFBench",
  scicode: "SciCode",
  terminalbench_hard: "TerminalBench Hard",
  critpt: "CritPT",
  tau2: "TAU-2",
  gdpval_aa: "GDPVal",
  aa_omniscience_accuracy: "Omniscience Accuracy",
  aa_omniscience_non_hallucination_rate: "Non-Hallucination Rate",
};

const DA_CATEGORY_LABELS: Record<string, string> = {
  ascii: "ASCII Art",
  svg: "SVG",
  website: "Website",
  codecategories: "Code",
  gamedev: "Game Dev",
  dataviz: "Data Viz",
  "3d": "3D",
  uicomponent: "UI Component",
  fullstack: "Fullstack",
  agon_webapps: "Web Apps",
  nativeapps: "Native Apps",
  mobileapps: "Mobile Apps",
};

function formatEvalValue(key: string, value: number): string {
  if (key.endsWith("_index")) return value.toFixed(1);
  if (value > 1) return value.toFixed(1);
  return `${(value * 100).toFixed(1)}%`;
}

function AABenchmarkCard({ entry }: { entry: ORAAbenchmarkEntry }) {
  const evals = entry.benchmark_data.evaluations;
  const topKeys = [
    "artificial_analysis_intelligence_index",
    "artificial_analysis_coding_index",
    "artificial_analysis_agentic_index",
  ].filter((k) => evals[k] != null);

  const otherKeys = Object.keys(evals).filter(
    (k) => !topKeys.includes(k) && evals[k] != null,
  );

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">{entry.aa_name}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Artificial Analysis</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {entry.percentiles.intelligence_percentile != null && (
            <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[11px] text-cyan-400">
              Intelligence p{entry.percentiles.intelligence_percentile}
            </span>
          )}
          {entry.percentiles.coding_percentile != null && (
            <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[11px] text-violet-400">
              Coding p{entry.percentiles.coding_percentile}
            </span>
          )}
          {entry.percentiles.agentic_percentile != null && (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-400">
              Agentic p{entry.percentiles.agentic_percentile}
            </span>
          )}
        </div>
      </div>

      {topKeys.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {topKeys.map((k) => (
            <div key={k} className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500 mb-1">
                {AA_EVAL_LABELS[k] ?? k}
              </p>
              <p className="text-lg font-semibold text-white">{formatEvalValue(k, evals[k])}</p>
            </div>
          ))}
        </div>
      )}

      {otherKeys.length > 0 && (
        <div>
          <p className="text-[11px] text-slate-500 mb-2">Detailed evaluations</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {otherKeys.map((k) => (
              <div key={k} className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                <span className="text-[11px] text-slate-400">{AA_EVAL_LABELS[k] ?? k}</span>
                <span className="text-[11px] font-medium text-white ml-2">{formatEvalValue(k, evals[k])}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DesignArenaSection({
  records,
  eloBounds,
}: {
  records: ORDesignArenaRecord[];
  eloBounds?: { min: number; max: number };
}) {
  const arenas = Array.from(new Set(records.map((r) => r.arena)));

  return (
    <div className="space-y-6">
      {arenas.map((arena) => {
        const arenaRecords = records.filter((r) => r.arena === arena);
        return (
          <div key={arena}>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
              {arena === "models" ? "Design Arena — Models" : `Design Arena — ${arena.charAt(0).toUpperCase() + arena.slice(1)}`}
            </p>
            <div className="space-y-2">
              {arenaRecords.map((r) => {
                const eloMin = eloBounds?.min ?? 500;
                const eloMax = eloBounds?.max ?? 1400;
                const eloNorm = Math.max(0, Math.min(100, ((r.elo - eloMin) / (eloMax - eloMin)) * 100));
                return (
                  <div
                    key={`${r.arena}-${r.category}`}
                    className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                  >
                    <div className="w-28 shrink-0">
                      <p className="text-[11px] text-slate-300">
                        {DA_CATEGORY_LABELS[r.category] ?? r.category}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="h-1.5 w-full rounded-full bg-white/[0.06]">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                          style={{ width: `${eloNorm}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-right">
                      <div>
                        <p className="text-[10px] text-slate-500">ELO</p>
                        <p className="text-sm font-semibold text-white">{r.elo}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500">Win Rate</p>
                        <p className="text-sm font-semibold text-white">{r.win_rate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500">Percentile</p>
                        <p className="text-sm font-semibold text-white">p{r.elo_percentile}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ORBenchmarksSection({ data }: { data: ORBenchmarkData }) {
  return (
    <div className="space-y-8">
      {data.aaBenchmarks.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">
            Artificial Analysis Benchmarks
          </p>
          {data.aaBenchmarks.map((entry) => (
            <AABenchmarkCard key={entry.aa_id} entry={entry} />
          ))}
        </div>
      )}

      {data.designArena.length > 0 && (
        <DesignArenaSection records={data.designArena} eloBounds={data.eloBounds} />
      )}
    </div>
  );
}

function TrafficShareChart({ distribution }: { distribution: Array<{ provider: string; share: number }> }) {
  const total = distribution.reduce((s, d) => s + d.share, 0) || 1;
  const sorted = [...distribution].sort((a, b) => b.share - a.share);

  const TRACK_COLORS = [
    { bar: "#2dd4bf", glow: "rgba(45,212,191,0.35)", bg: "rgba(45,212,191,0.08)" },
    { bar: "#22d3ee", glow: "rgba(34,211,238,0.35)", bg: "rgba(34,211,238,0.08)" },
    { bar: "#a78bfa", glow: "rgba(167,139,250,0.35)", bg: "rgba(167,139,250,0.08)" },
    { bar: "#fb7185", glow: "rgba(251,113,133,0.35)", bg: "rgba(251,113,133,0.08)" },
    { bar: "#f59e0b", glow: "rgba(245,158,11,0.35)", bg: "rgba(245,158,11,0.08)" },
  ];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500">Traffic Share by Provider</p>
        <span className="text-[10px] text-slate-600">{distribution.length} provider{distribution.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="space-y-3.5">
        {sorted.map((row, idx) => {
          const pct = (row.share / total) * 100;
          const color = TRACK_COLORS[idx % TRACK_COLORS.length];
          const shortName = row.provider.length > 28 ? row.provider.slice(0, 28) + "…" : row.provider;

          return (
            <div key={row.provider}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color.bar, boxShadow: `0 0 6px ${color.glow}` }}
                  />
                  <span className="truncate text-[12px] text-slate-300">{shortName}</span>
                </div>
                <span
                  className="shrink-0 text-[13px] font-semibold tabular-nums"
                  style={{ color: color.bar }}
                >
                  {row.share.toFixed(1)}%
                </span>
              </div>
              <div
                className="relative h-[5px] w-full overflow-hidden rounded-full"
                style={{ backgroundColor: color.bg }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color.bar,
                    boxShadow: `0 0 8px ${color.glow}`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Stacked visual bar at bottom */}
      <div className="mt-5 flex h-1.5 w-full overflow-hidden rounded-full">
        {sorted.map((row, idx) => {
          const pct = (row.share / total) * 100;
          const color = TRACK_COLORS[idx % TRACK_COLORS.length];
          return (
            <div
              key={row.provider}
              style={{ width: `${pct}%`, backgroundColor: color.bar }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ModelDetailView({ model }: { model: ModelDetailViewModel }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("pricing");
  const [copiedApiSnippet, setCopiedApiSnippet] = useState(false);

  const hasBenchmarkData = Boolean(model.orBenchmarks);

  const visibleSectionItems = useMemo(
    () => (hasBenchmarkData ? sectionItems : sectionItems.filter((s) => s.id !== "benchmarks")),
    [hasBenchmarkData],
  );

  /** When benchmarks are unavailable, map a stale "benchmarks" selection to pricing for display. */
  const displayActiveSection: SectionId =
    !hasBenchmarkData && activeSection === "benchmarks" ? "pricing" : activeSection;

  const copySlug = async () => {
    try {
      await navigator.clipboard.writeText(model.hero.slug);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const apiTabModelName = model.hero.name.replace(/7b/gi, "1.5b");

  const apiCurlSnippet = useMemo(() => {
    const trimmedBaseUrl = model.api.baseUrl.replace(/\/$/, "");
    const chatCompletionsUrl = `${trimmedBaseUrl}/chat/completions`;

    const reasoningBlock = model.hero.supportsReasoning
      ? `,
    "reasoning": {
      "enabled": true
    }`
      : "";

    return `curl ${chatCompletionsUrl} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $ZKAI_API_KEY" \\
  -d '{
    "model": "${model.hero.slug}",
    "messages": [
      {
        "role": "user",
        "content": "How many r's are in the word strawberry?"
      }
    ]${reasoningBlock}
  }'`;
  }, [model.api.baseUrl, model.hero.slug, model.hero.supportsReasoning]);

  const copyApiSnippet = async () => {
    try {
      await navigator.clipboard.writeText(apiCurlSnippet);
      setCopiedApiSnippet(true);
      setTimeout(() => setCopiedApiSnippet(false), 1500);
    } catch {
      setCopiedApiSnippet(false);
    }
  };

  const goToApiKeys = () => {
    router.push("/dashboard?section=api-keys");
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

  const providersThroughputFromPerf = model.orPerformance
    ? latestAvg(model.orPerformance.throughput)
    : null;
  const hardcodedProviderUptime = 99.4;

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
          {visibleSectionItems.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              aria-pressed={displayActiveSection === item.id}
              className={cn(
                "shrink-0 border-b-2 px-4 py-3.5 text-sm font-medium transition-colors",
                displayActiveSection === item.id
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
      <div className="divide-y divide-white/[0.07] [&>section:last-of-type]:border-b-0">

        {/* ── Pricing ── */}
        <section className={cn("py-10", displayActiveSection === "pricing" ? "block" : "hidden")}>
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
        <section className={cn("py-10", displayActiveSection === "providers" ? "block" : "hidden")}>
          <SectionHeading title="Providers" live={model.hasRealData.providers} />

          {model.providers ? (
            <div className="space-y-8">
              {/* OpenRouter-style providers layout */}
              {model.providers.zkaiProviders && model.providers.zkaiProviders.length > 0 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold tracking-tight text-white">
                      Providers for {model.hero.name}
                    </h3>
                    <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
                      zkAI routes requests to the best providers that are able to handle your prompt size and parameters, with fallbacks to maximize uptime.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {model.providers.zkaiProviders.map((provider) => {
                      const endpointMeta = model.providers?.endpoints.find((e) => e.endpoint === provider.id);
                      const routeShare = shareByProvider.get(provider.id);

                      const hw = provider.hardware as Record<string, unknown> | undefined;
                      const cpuModel = hw?.cpu_model as string | undefined;
                      const cpuCores = hw?.cpu_cores as number | undefined;
                      const ramMb = hw?.ram_total_mb as number | undefined;
                      const gpu = hw?.gpu as string | undefined;
                      const hasHardware = cpuModel || cpuCores != null || ramMb != null || gpu;

                      const providerLabel = provider.endpoint.replace(/^https?:\/\//, "").split("/")[0] || provider.id.slice(0, 8);
                      const latencyLabel =
                        provider.avgLatencyMs == null
                          ? "—"
                          : provider.avgLatencyMs >= 1000
                            ? `${(provider.avgLatencyMs / 1000).toFixed(2)}s`
                            : `${Math.round(provider.avgLatencyMs)}ms`;
                      const throughputLabel =
                        providersThroughputFromPerf != null
                          ? `${providersThroughputFromPerf.toFixed(0)} tok/s`
                          : endpointMeta?.throughputRps && endpointMeta.throughputRps > 0
                            ? `${endpointMeta.throughputRps.toFixed(0)} rps`
                          : "—";
                      const reputationPct = Math.max(0, Math.min(100, Math.round(provider.reputation * 100)));
                      const reputationBars = Math.max(1, Math.round((reputationPct / 100) * 5));
                      const statusTone =
                        endpointMeta?.status === "degraded"
                          ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                          : endpointMeta?.status === "unstable"
                            ? "border-rose-400/30 bg-rose-400/10 text-rose-300"
                            : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";

                      return (
                        <div key={provider.id} className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
                          <div className="px-5 py-4">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="truncate text-lg font-medium text-white">{providerLabel}</p>
                                <p className="mt-1 truncate font-mono text-[11px] text-slate-500">{provider.id}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                                  <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-slate-300">
                                    {endpointMeta?.region ?? "Global"}
                                  </span>
                                  <span className={cn("rounded-md border px-2 py-0.5 capitalize", statusTone)}>
                                    {endpointMeta?.status ?? "healthy"}
                                  </span>
                                  <span className="rounded-md border border-teal-400/25 bg-teal-400/10 px-2 py-0.5 text-teal-300">
                                    fallback enabled
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-5 text-right sm:gap-8">
                                <div>
                                  <p className="text-[11px] text-slate-500">Latency</p>
                                  <p className="mt-0.5 text-lg font-semibold text-white">{latencyLabel}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] text-slate-500">Throughput</p>
                                  <p className="mt-0.5 text-lg font-semibold text-white">{throughputLabel}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] text-slate-500">Uptime</p>
                                  <p className="mt-0.5 text-lg font-semibold text-emerald-300">
                                    {hardcodedProviderUptime.toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-x-5 gap-y-4 border-t border-white/[0.08] px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <p className="text-[11px] text-slate-500">Total Context</p>
                              <p className="mt-1 text-xl font-semibold tracking-tight text-white">
                                {formatContextLength(model.hero.contextLength)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-slate-500">Max Output</p>
                              <p className="mt-1 text-xl font-semibold tracking-tight text-white">
                                {model.hero.tokens || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-slate-500">Input Price</p>
                              <p className="mt-1 text-xl font-semibold tracking-tight text-white">
                                {model.price ? formatUsd(model.price.inputPerM) : model.hero.inputPrice}
                              </p>
                              <p className="text-[11px] text-slate-500">/1M tokens</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-slate-500">Output Price</p>
                              <p className="mt-1 text-xl font-semibold tracking-tight text-white">
                                {model.price ? formatUsd(model.price.outputPerM) : model.hero.outputPrice}
                              </p>
                              <p className="text-[11px] text-slate-500">/1M tokens</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-slate-500">Route Share</p>
                              <p className="mt-1 text-xl font-semibold tracking-tight text-white">
                                {typeof routeShare === "number" ? `${routeShare.toFixed(1)}%` : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-slate-500">Reputation</p>
                              <div className="mt-1">
                                <div className="flex items-end gap-1">
                                  {[0, 1, 2, 3, 4].map((i) => (
                                    <span
                                      key={i}
                                      className={cn(
                                        "w-1 rounded-sm",
                                        i < reputationBars ? "bg-teal-300" : "bg-white/10",
                                      )}
                                      style={{ height: `${6 + i * 2}px` }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {hasHardware && (
                            <div className="grid grid-cols-2 gap-3 border-t border-white/[0.08] px-5 py-4 sm:grid-cols-4">
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

              {/* Traffic share chart */}
              {model.providers.distribution && model.providers.distribution.length > 0 && (
                <TrafficShareChart distribution={model.providers.distribution} />
              )}
            </div>
          ) : (
            <EmptyState message="No active providers registered for this model." />
          )}
        </section>

        {/* ── Performance ── */}
        <section className={cn("py-10", displayActiveSection === "performance" ? "block" : "hidden")}>
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

        {/* ── Benchmarks (tab + section only when OpenRouter returned benchmark data) ── */}
        {model.orBenchmarks && (
        <section className={cn("py-10", displayActiveSection === "benchmarks" ? "block" : "hidden")}>
          <SectionHeading title="Benchmarks" live={false} />

          <ORBenchmarksSection data={model.orBenchmarks} />

          {/* ── zkAI / Artificial Analysis radar (commented out until we have our own benchmark endpoint) ──
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
          ── end zkAI benchmark radar ── */}
        </section>
        )}

        {/* ── Apps ── */}
        <section className={cn("py-10", displayActiveSection === "apps" ? "block" : "hidden")}>
          <SectionHeading title="Apps" live={false} />

          {model.orAppsActivity ? (
            <ORAppsSection data={model.orAppsActivity} />
          ) : (
            <EmptyState message="No app usage data available for this model." />
          )}

          {/* ── zkAI internal apps data (commented out until we have our own apps endpoint) ──
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
          ── end zkAI internal apps ── */}
        </section>

        {/* ── Activity ── */}
        <section className={cn("py-10", displayActiveSection === "activity" ? "block" : "hidden")}>
          <SectionHeading title="Activity" live={false} />

          {model.orAppsActivity ? (
            <ORActivitySection data={model.orAppsActivity} />
          ) : (
            <EmptyState message="No activity data available for this model." />
          )}

          {/* ── zkAI internal activity data (commented out until we have our own activity endpoint) ──
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
          ── end zkAI internal activity ── */}
        </section>

        {/* ── Uptime ── */}
        <section className={cn("py-10", displayActiveSection === "uptime" ? "block" : "hidden")}>
          <SectionHeading title="Uptime" live={false} />

          {model.orUptime ? (
            <ORUptimeSection data={model.orUptime} />
          ) : (
            <EmptyState message="No uptime data available for this model." />
          )}

          {/* ── zkAI internal uptime data (commented out until we have our own uptime endpoint) ──
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
          ── end zkAI internal uptime ── */}
        </section>

        {/* ── API ── */}
        <section className={cn("py-10", displayActiveSection === "api" ? "block" : "hidden")}>
          <SectionHeading title="API" />

          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-3xl font-semibold tracking-tight text-white">
                Sample code and API for {apiTabModelName}
              </h3>
              <p className="text-lg text-slate-400">
                zkAI normalizes requests and responses across providers for you.
              </p>
              <button
                type="button"
                onClick={goToApiKeys}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-[#001018] shadow-[0_8px_24px_rgba(6,182,212,0.3)] transition hover:bg-cyan-400"
              >
                <KeyRound className="h-4 w-4" />
                Create API key
              </button>
            </div>

            <div className="space-y-4 text-[17px] leading-8 text-slate-300">
              <p>
                zkAI supports reasoning-enabled models that can show their step-by-step thinking process. Use
                the <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-sm text-slate-100">reasoning</code>{" "}
                parameter in your request to enable reasoning, and access the{" "}
                <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-sm text-slate-100">reasoning_details</code>{" "}
                array in the response.
              </p>
              <p>
                In the example below, provider-specific headers are optional and can be added based on your app
                analytics needs.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0b1018]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
                <span className="rounded-md border border-slate-300/40 bg-slate-100/10 px-2.5 py-0.5 text-xs text-slate-100">
                  curl
                </span>
                <button
                  type="button"
                  onClick={copyApiSnippet}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.12] px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/[0.06]"
                >
                  {copiedApiSnippet ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedApiSnippet ? "Copied" : "Copy"}
                </button>
              </div>

              <pre className="overflow-x-auto px-4 py-4 text-sm leading-relaxed text-slate-200">
                <code>{apiCurlSnippet}</code>
              </pre>
            </div>
          </div>
        </section>

      </div>
      </div>
    </>
  );
}
