"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AppWindow,
  Check,
  Clock3,
  Code2,
  Copy,
  Gauge,
  Layers,
  Server,
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

const sectionItems = [
  { id: "price", label: "Price", icon: Layers },
  { id: "uptime", label: "Uptime", icon: Clock3 },
  { id: "providers", label: "Providers", icon: Server },
  { id: "performance", label: "Performance", icon: Gauge },
  { id: "apps", label: "Apps", icon: AppWindow },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "api", label: "API", icon: Code2 },
] as const;

const PIE_COLORS = ["#5eead4", "#22d3ee", "#f59e0b", "#fb7185"];

const tooltipStyle = {
  backgroundColor: "rgba(4, 10, 18, 0.94)",
  borderColor: "rgba(148, 163, 184, 0.28)",
  borderRadius: "10px",
  color: "#e2e8f0",
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

function SectionCard({
  title,
  description,
  children,
  icon: Icon,
  id,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  icon: React.ElementType;
  id: string;
}) {
  return (
    <motion.section
      id={id}
      data-section={id}
      className="scroll-mt-40 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 sm:p-6"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h2>
          <p className="mt-1 text-sm text-slate-300/80">{description}</p>
        </div>
        <div className="rounded-lg border border-white/15 bg-slate-950/60 p-2 text-teal-200">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function MetricCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "accent" }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5",
        tone === "accent"
          ? "border-teal-300/25 bg-teal-500/10 text-teal-100"
          : "border-white/10 bg-black/35 text-slate-100",
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-base font-semibold tracking-tight sm:text-lg">{value}</p>
    </div>
  );
}

export function ModelDetailView({ model }: { model: ModelDetailViewModel }) {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<(typeof sectionItems)[number]["id"]>("price");

  const keyStats = useMemo(
    () => [
      { label: "Context", value: `${formatContextLength(model.hero.contextLength)} tokens` },
      { label: "Input / 1M", value: model.hero.inputPrice },
      { label: "Output / 1M", value: model.hero.outputPrice },
      { label: "Median TTFT", value: `${model.performance.summary.medianTtftMs} ms` },
      { label: "Current Uptime", value: `${model.uptime.currentPercent.toFixed(2)}%` },
      { label: "24h Requests", value: formatNumber(model.activity.requests24h) },
    ],
    [
      model.activity.requests24h,
      model.hero.contextLength,
      model.hero.inputPrice,
      model.hero.outputPrice,
      model.performance.summary.medianTtftMs,
      model.uptime.currentPercent,
    ],
  );

  useEffect(() => {
    const nodes = sectionItems
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => Boolean(node));

    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id as (typeof sectionItems)[number]["id"]);
        }
      },
      {
        rootMargin: "-40% 0px -45% 0px",
        threshold: [0.05, 0.2, 0.35],
      },
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
    <div className="relative z-10 mx-auto w-full max-w-[1320px] px-4 pb-20 pt-24 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
        <div className="absolute -left-16 top-10 h-[320px] w-[320px] rounded-full bg-teal-400/20 blur-[120px]" />
        <div className="absolute right-0 top-28 h-[280px] w-[280px] rounded-full bg-cyan-400/15 blur-[110px]" />
        <div className="absolute bottom-1/4 left-1/3 h-[280px] w-[280px] rounded-full bg-amber-300/10 blur-[130px]" />
      </div>

      <motion.section
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_0%_0%,rgba(45,212,191,0.16),transparent_38%),radial-gradient(circle_at_96%_0%,rgba(34,211,238,0.16),transparent_42%),linear-gradient(165deg,rgba(2,6,23,0.92),rgba(3,7,18,0.7))] p-6 sm:p-8"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle,white_0.8px,transparent_1px)] [background-size:3px_3px]" />

        <div className="relative grid gap-7 lg:grid-cols-[1.2fr_0.8fr] lg:gap-8">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300/70">
              Models / {model.hero.provider}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-teal-300/35 bg-teal-300/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-teal-100">
                {model.hero.category}
              </span>
              {model.hero.modalities.map((mode) => (
                <span key={mode} className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-slate-200/85">
                  {mode}
                </span>
              ))}
              {model.hero.isFree && (
                <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-amber-100">
                  Free Tier
                </span>
              )}
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {model.hero.name}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-200/85 sm:text-base">
              {model.hero.description}
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              {model.hero.tags.map((tag) => (
                <span key={tag} className="rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-200/80">
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="rounded-xl bg-teal-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-200">
                Try Playground
              </button>
              <button
                onClick={copySlug}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-slate-950/55 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-white/30 hover:bg-slate-900/60"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-teal-300" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Model Copied" : "Copy Model ID"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-300/70">Live Snapshot</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {keyStats.map((stat, idx) => (
                <MetricCard key={stat.label} label={stat.label} value={stat.value} tone={idx === 0 ? "accent" : "default"} />
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Top Routing Providers</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {model.providers.distribution.slice(0, 4).map((provider) => (
                  <span key={provider.provider} className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-xs text-slate-200/85">
                    {provider.provider} {provider.share.toFixed(1)}%
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">Updated {model.hero.lastUpdated}</p>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="sticky top-[72px] z-30 mt-6 border-y border-white/10 bg-slate-950/78 backdrop-blur-xl">
        <div className="scrollbar-none flex items-center gap-2 overflow-x-auto px-2 py-2 sm:px-3">
          {sectionItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition",
                  activeSection === item.id
                    ? "border-teal-300/50 bg-teal-300/15 text-teal-100"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:text-white",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </a>
            );
          })}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <SectionCard
          id="price"
          title="Price"
          description="Cost profile across request volume and effective blended spend."
          icon={Layers}
        >
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Input / 1M" value={formatUsd(model.price.inputPerM)} tone="accent" />
            <MetricCard label="Output / 1M" value={formatUsd(model.price.outputPerM)} />
            <MetricCard label="Effective / 1M" value={formatUsd(model.price.effectivePerM)} />
            <MetricCard label="Observed Discount" value={`${model.price.discountPercent}%`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3 sm:p-4">
              <p className="mb-2 text-sm text-slate-300">14-day pricing trend</p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={model.price.trend} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="priceInput" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5eead4" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#5eead4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="priceOutput" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fb7185" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                    <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
                    <Area type="monotone" dataKey="input" name="Input" stroke="#5eead4" fill="url(#priceInput)" strokeWidth={2} />
                    <Area type="monotone" dataKey="output" name="Output" stroke="#fb7185" fill="url(#priceOutput)" strokeWidth={2} />
                    <Line type="monotone" dataKey="effective" name="Effective" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3 sm:p-4">
              <p className="mb-2 text-sm text-slate-300">Routing tier mix</p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={model.price.tiers} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="requestsShare" fill="#22d3ee" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="costPer1k" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          id="uptime"
          title="Uptime"
          description="Recent reliability, hourly stability, and region-level health profile."
          icon={Clock3}
        >
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Current Uptime" value={`${model.uptime.currentPercent.toFixed(2)}%`} tone="accent" />
            <MetricCard label="Incidents (30d)" value={`${model.uptime.incidentCount30d}`} />
            <MetricCard label="Best Region" value={`${model.uptime.regions[0]?.region ?? "-"}`} />
            <MetricCard label="Avg Region Latency" value={`${Math.round(model.uptime.regions.reduce((sum, item) => sum + item.latencyMs, 0) / model.uptime.regions.length)} ms`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3 sm:p-4">
              <p className="mb-2 text-sm text-slate-300">24-hour uptime timeline</p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={model.uptime.timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                    <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
                    <YAxis yAxisId="left" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} domain={[95, 100]} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 2.8]} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
                    <Line yAxisId="left" type="monotone" dataKey="uptime" stroke="#34d399" strokeWidth={2.2} dot={false} name="Uptime %" />
                    <Line yAxisId="right" type="monotone" dataKey="errorRate" stroke="#fb7185" strokeWidth={2} dot={false} name="Error %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3 sm:p-4">
              <p className="mb-2 text-sm text-slate-300">Regional reliability</p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={model.uptime.regions} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                    <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} domain={[95, 100]} />
                    <YAxis type="category" dataKey="region" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={95} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="uptime" fill="#2dd4bf" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          id="providers"
          title="Providers"
          description="Provider routing distribution and endpoint-level status overview."
          icon={Server}
        >
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3 sm:p-4">
              <p className="mb-2 text-sm text-slate-300">Traffic share by provider</p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={model.providers.distribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                    <XAxis dataKey="provider" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="share" fill="#5eead4" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid gap-3">
              {model.providers.endpoints.map((endpoint) => (
                <div key={endpoint.endpoint} className="rounded-xl border border-white/10 bg-black/35 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-100">{endpoint.endpoint}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] uppercase tracking-[0.12em]",
                        endpoint.status === "healthy" && "bg-emerald-400/15 text-emerald-200",
                        endpoint.status === "degraded" && "bg-amber-300/15 text-amber-200",
                        endpoint.status === "unstable" && "bg-rose-300/15 text-rose-200",
                      )}
                    >
                      {endpoint.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{endpoint.region}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-white/10 bg-slate-900/50 px-2 py-1.5 text-slate-200">
                      Uptime {endpoint.uptime.toFixed(2)}%
                    </div>
                    <div className="rounded-lg border border-white/10 bg-slate-900/50 px-2 py-1.5 text-slate-200">
                      {endpoint.throughputRps} req/s
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          id="performance"
          title="Performance"
          description="Latency profile, throughput behavior, and capability radar snapshot."
          icon={Gauge}
        >
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Median TTFT" value={`${model.performance.summary.medianTtftMs} ms`} tone="accent" />
            <MetricCard label="Median Output TPS" value={`${model.performance.summary.medianTokensPerSecond} tok/s`} />
            <MetricCard label="P95 Latency" value={`${model.performance.summary.p95LatencyMs} ms`} />
            <MetricCard label="Quality Index" value={`${model.performance.summary.qualityScore}`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3 sm:p-4">
              <p className="mb-2 text-sm text-slate-300">Latency under load</p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={model.performance.latencySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                    <XAxis dataKey="bucket" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
                    <Line type="monotone" dataKey="p50" name="P50" stroke="#2dd4bf" strokeWidth={2.2} dot={false} />
                    <Line type="monotone" dataKey="p95" name="P95" stroke="#fb7185" strokeWidth={2.2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3 sm:p-4">
              <p className="mb-2 text-sm text-slate-300">Capability radar</p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={model.performance.benchmarkRadar}>
                    <PolarGrid stroke="rgba(148,163,184,0.2)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                    <PolarRadiusAxis domain={[40, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Radar dataKey="score" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.4} />
                    <Tooltip contentStyle={tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          id="apps"
          title="Apps"
          description="Adoption momentum and top public apps currently using this model."
          icon={AppWindow}
        >
          <div className="grid gap-4 lg:grid-cols-[1.25fr_0.95fr]">
            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3 sm:p-4">
              <p className="mb-2 text-sm text-slate-300">Weekly app adoption</p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={model.apps.adoptionSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="appsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                    <XAxis dataKey="week" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
                    <Area yAxisId="left" type="monotone" dataKey="apps" stroke="#22d3ee" fill="url(#appsGrad)" name="Apps" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="requestsK" stroke="#f59e0b" name="Requests (K)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid gap-3">
              {model.apps.topApps.map((app) => (
                <div key={app.name} className="rounded-xl border border-white/10 bg-black/35 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-100">{app.name}</p>
                      <p className="text-xs text-slate-400">{app.category}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-300/15 px-2 py-0.5 text-xs text-emerald-100">
                      <TrendingUp className="h-3 w-3" />
                      +{app.growthPercent}%
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-200">{app.calls}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          id="activity"
          title="Activity"
          description="Request throughput and operation mix over the most recent 24-hour window."
          icon={Activity}
        >
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Requests (24h)" value={formatNumber(model.activity.requests24h)} tone="accent" />
            <MetricCard
              label="Peak Hour"
              value={`${formatNumber(Math.max(...model.activity.requestSeries.map((point) => point.requests)))} req`}
            />
            <MetricCard
              label="Avg Success"
              value={`${(
                model.activity.requestSeries.reduce((sum, point) => sum + point.successRate, 0) /
                model.activity.requestSeries.length
              ).toFixed(2)}%`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3 sm:p-4">
              <p className="mb-2 text-sm text-slate-300">Hourly request and success trend</p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={model.activity.requestSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                    <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
                    <YAxis yAxisId="left" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" domain={[95, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
                    <Line yAxisId="left" dataKey="requests" stroke="#22d3ee" strokeWidth={2} dot={false} name="Requests" />
                    <Line yAxisId="right" dataKey="successRate" stroke="#2dd4bf" strokeWidth={2} dot={false} name="Success %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3 sm:p-4">
              <p className="mb-2 text-sm text-slate-300">Operation mix</p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={model.activity.operationMix}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={86}
                      paddingAngle={3}
                    >
                      {model.activity.operationMix.map((entry, idx) => (
                        <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          id="api"
          title="API"
          description="Reference endpoints and request shapes for integrating this model."
          icon={Code2}
        >
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-black/35 p-3.5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Base URL</p>
                <p className="mt-1 break-all font-mono text-sm text-teal-100">{model.api.baseUrl}</p>
              </div>

              {model.api.endpoints.map((endpoint) => (
                <div key={endpoint.path} className="rounded-xl border border-white/10 bg-black/35 p-3.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-[0.12em]",
                        endpoint.method === "POST" ? "bg-cyan-300/20 text-cyan-100" : "bg-emerald-300/20 text-emerald-100",
                      )}
                    >
                      {endpoint.method}
                    </span>
                    <p className="font-mono text-sm text-slate-100">{endpoint.path}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{endpoint.description}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-slate-950/65 p-3.5">
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-slate-400">Sample Request</p>
                <pre className="overflow-x-auto text-xs leading-relaxed text-slate-200">
                  <code>{model.api.sampleRequest}</code>
                </pre>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/65 p-3.5">
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-slate-400">Sample Response</p>
                <pre className="overflow-x-auto text-xs leading-relaxed text-slate-200">
                  <code>{model.api.sampleResponse}</code>
                </pre>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <motion.div
        className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <Sparkles className="h-3.5 w-3.5 text-teal-300" />
        Mock data view, deterministic by model slug for design validation.
      </motion.div>
    </div>
  );
}
