"use client";

import { useEffect, useState } from "react";
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

import { cn } from "@/lib/utils";
import type { ModelDetailViewModel } from "@/lib/types/model-detail";

type SectionId = "overview" | "providers" | "performance" | "activity" | "uptime" | "api";

const sectionItems: { id: SectionId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "providers", label: "Providers" },
  { id: "performance", label: "Performance" },
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

export function ModelDetailView({ model }: { model: ModelDetailViewModel }) {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("overview");

  useEffect(() => {
    const nodes = sectionItems
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => Boolean(node));

    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id as SectionId);
        }
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: [0.05, 0.2, 0.35] },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const copySlug = async () => {
    try {
      await navigator.clipboard.writeText(model.hero.slug);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
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

        {/* zkAI provider notice */}
        {model.hero.zkaiProvider && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-teal-400/20 bg-teal-400/[0.06] px-3 py-2 text-sm text-teal-300">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <span>zkAI Provider available — {model.hero.zkaiProvider.endpoint}</span>
          </div>
        )}
      </section>

      {/* ── Tab Nav ───────────────────────────────────────────── */}
      <div className="sticky top-[72px] z-30 -mx-4 border-b border-white/[0.07] bg-black/80 backdrop-blur-md sm:-mx-6">
        <div className="mx-auto flex max-w-4xl gap-0 overflow-x-auto px-4 sm:px-6">
          {sectionItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={cn(
                "shrink-0 border-b-2 px-4 py-3.5 text-sm font-medium transition-colors",
                activeSection === item.id
                  ? "border-teal-400 text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300",
              )}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>

      {/* ── Sections ─────────────────────────────────────────── */}
      <div className="divide-y divide-white/[0.07]">

        {/* ── Overview / Pricing ── */}
        <section id="overview" data-section="overview" className="scroll-mt-40 py-10">
          <SectionHeading title="Overview & Pricing" live={model.hasRealData.price} />

          {model.price ? (
            <>
              {/* zkAI provider notice */}
              {model.hero.zkaiProvider && (
                <div className="mb-6 flex items-start gap-2 text-sm text-teal-300">
                  <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div>
                    <span className="font-medium">zkAI Provider</span>
                    <span className="ml-2 text-teal-400/70">{model.hero.zkaiProvider.endpoint}</span>
                    <span className="ml-3 text-teal-400/60">${model.hero.zkaiProvider.price.toFixed(4)}/req · rep {model.hero.zkaiProvider.reputation.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Pricing stats row */}
              <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Input / 1M", value: formatUsd(model.price.inputPerM) },
                  { label: "Output / 1M", value: formatUsd(model.price.outputPerM) },
                  { label: "Effective / 1M", value: formatUsd(model.price.effectivePerM) },
                  { label: "Discount", value: `${model.price.discountPercent}%` },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-4 py-3.5">
                    <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">{s.label}</p>
                    <p className="mt-1.5 text-2xl font-semibold tracking-tight text-white">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-3 text-xs text-slate-500">14-day pricing trend</p>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={model.price.trend} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                        <defs>
                          <linearGradient id="priceInput" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#5eead4" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#5eead4" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="priceOutput" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fb7185" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                        <Area type="monotone" dataKey="input" name="Input" stroke="#5eead4" fill="url(#priceInput)" strokeWidth={1.5} />
                        <Area type="monotone" dataKey="output" name="Output" stroke="#fb7185" fill="url(#priceOutput)" strokeWidth={1.5} />
                        <Line type="monotone" dataKey="effective" name="Effective" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs text-slate-500">Routing tier mix</p>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={model.price.tiers} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="requestsShare" name="Requests %" fill="#22d3ee" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="costPer1k" name="Cost/1k" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <EmptyState message="Pricing data unavailable for this model." />
          )}
        </section>

        {/* ── Providers ── */}
        <section id="providers" data-section="providers" className="scroll-mt-40 py-10">
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
        <section id="performance" data-section="performance" className="scroll-mt-40 py-10">
          <SectionHeading title="Performance" live={model.hasRealData.performance} />

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

              {/* Real telemetry from jobs: CPU + RAM */}
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

              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <div>
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

                <div>
                  <p className="mb-3 text-xs text-slate-500">Capability radar</p>
                  {model.performance.benchmarkRadar && model.performance.benchmarkRadar.length > 0 ? (
                    <div className="h-52">
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
                  ) : (
                    <EmptyState message="No benchmark data available." />
                  )}
                </div>
              </div>
            </>
          ) : (
            <EmptyState message="No performance data recorded for this model yet." />
          )}
        </section>

        {/* ── Activity ── */}
        <section id="activity" data-section="activity" className="scroll-mt-40 py-10">
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
        <section id="uptime" data-section="uptime" className="scroll-mt-40 py-10">
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
        <section id="api" data-section="api" className="scroll-mt-40 py-10">
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

        {/* ── Apps (conditional) ── */}
        {model.hasRealData.apps && model.apps && (
          <section id="apps" data-section="apps" className="scroll-mt-40 py-10">
            <SectionHeading title="Apps" live={true} />

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
          </section>
        )}
      </div>
    </div>
  );
}
