'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, Activity, CheckCircle, XCircle, Clock,
  Zap, Cpu, TrendingUp, Server, Wifi, WifiOff,
  ChevronRight, FileText, ExternalLink,
} from 'lucide-react';
import type { Job } from '@/lib/indexer';

// ── Types ────────────────────────────────────────────────────────────────────

interface ProviderInfo {
  id: string;
  endpoint: string;
  model: string;
  price: number;
  reputation: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const JOB_STATUS_COLOR = [
  'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  'text-green-400 bg-green-500/10 border-green-500/20',
  'text-red-400 bg-red-500/10 border-red-500/20',
];
const JOB_STATUS_LABEL = ['Pending', 'Completed', 'Refunded'];
const JOB_STATUS_ICON = [Clock, CheckCircle, XCircle];

function fmt(n: number | null | undefined, unit: string, decimals = 1) {
  if (n == null) return '—';
  return `${n.toFixed(decimals)} ${unit}`;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string;
  icon: typeof Activity; accent?: 'green' | 'violet';
}) {
  const color = accent === 'green' ? 'text-green-400' : 'text-violet-400';
  return (
    <div className="border border-white/10 rounded-2xl p-5 bg-white/[0.02]">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-4">
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm text-white/40">{label}</div>
      {sub && <div className="text-xs text-white/25 mt-1">{sub}</div>}
    </div>
  );
}

// ── Node status card ──────────────────────────────────────────────────────────

function NodeStatusCard({ provider }: { provider: ProviderInfo }) {
  const isRelay = provider.endpoint.includes('/relay/');
  const relayConnected = isRelay; // if endpoint is relay-style, assume connected

  return (
    <div className="border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Server className="w-4 h-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Node Info</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs text-white/30 mb-1">Provider ID</div>
          <div className="font-mono text-xs text-white/60 break-all">{provider.id}</div>
        </div>
        <div>
          <div className="text-xs text-white/30 mb-1">Model</div>
          <div className="text-white/70">{provider.model || '—'}</div>
        </div>
        <div>
          <div className="text-xs text-white/30 mb-1">Price</div>
          <div className="text-white/70">{provider.price} <span className="text-white/40 text-xs">tNIGHT/req</span></div>
        </div>
        <div>
          <div className="text-xs text-white/30 mb-1">Reputation</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden max-w-24">
              <div
                className="h-full bg-violet-500 rounded-full"
                style={{ width: `${Math.round(provider.reputation * 100)}%` }}
              />
            </div>
            <span className="text-white/60">{Math.round(provider.reputation * 100)}%</span>
          </div>
        </div>
        <div className="sm:col-span-2">
          <div className="text-xs text-white/30 mb-1">Endpoint</div>
          <div className="flex items-center gap-2">
            {isRelay
              ? <Wifi className="w-3.5 h-3.5 text-green-400 shrink-0" />
              : <WifiOff className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
            <span className="font-mono text-xs text-white/50 break-all">{provider.endpoint}</span>
          </div>
          {isRelay && (
            <div className="text-xs text-green-400/70 mt-1">Connected via Fly.io relay — no public IP needed</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Job row ───────────────────────────────────────────────────────────────────

function JobRow({ job }: { job: Job & { created_at?: string } }) {
  const [open, setOpen] = useState(false);
  const Icon = JOB_STATUS_ICON[job.status];

  return (
    <div className="divide-y divide-white/5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${job.status === 1 ? 'text-green-400' : job.status === 2 ? 'text-red-400' : 'text-yellow-400'}`} />
          <div className="min-w-0">
            <div className="text-sm font-mono text-white/60 truncate">{job.id.slice(0, 28)}…</div>
            <div className="text-xs text-white/30">{job.model || 'qwen2.5:1.5b'}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-4">
          <span className={`text-xs border px-2.5 py-0.5 rounded-full ${JOB_STATUS_COLOR[job.status]}`}>
            {JOB_STATUS_LABEL[job.status]}
          </span>
          <span className="text-sm text-green-400/80 tabular-nums">+{job.amount} tNIGHT</span>
          <ChevronRight className={`w-4 h-4 text-white/20 transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 bg-white/[0.015] border-t border-white/5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-sm">
            <div>
              <div className="text-xs text-white/30 mb-1.5">Job ID</div>
              <div className="font-mono text-xs text-white/60 break-all">{job.id}</div>
            </div>
            <div>
              <div className="text-xs text-white/30 mb-1.5">Earned</div>
              <div className="text-green-400 font-semibold">{job.amount} tNIGHT</div>
            </div>
            <div>
              <div className="text-xs text-white/30 mb-1.5">Status</div>
              <span className={`text-xs border px-2.5 py-0.5 rounded-full ${JOB_STATUS_COLOR[job.status]}`}>
                {JOB_STATUS_LABEL[job.status]}
              </span>
            </div>
            <div>
              <div className="text-xs text-white/30 mb-1.5">Duration</div>
              <div className="text-white/70">{fmt(job.duration_ms ? job.duration_ms / 1000 : null, 's')}</div>
            </div>
          </div>

          {(job.prompt_tokens != null || job.cpu_percent != null) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-white/[0.03] rounded-xl">
              <div className="text-center">
                <div className="text-lg font-bold text-white">{job.prompt_tokens ?? '—'}</div>
                <div className="text-xs text-white/30">Input tokens</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white">{job.completion_tokens ?? '—'}</div>
                <div className="text-xs text-white/30">Output tokens</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white">{fmt(job.cpu_percent, '%', 0)}</div>
                <div className="text-xs text-white/30">Avg CPU</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white">{fmt(job.ram_mb, 'MB', 0)}</div>
                <div className="text-xs text-white/30">Avg RAM</div>
              </div>
            </div>
          )}

          {job.attestation_hash && (
            <div>
              <div className="text-xs text-white/30 mb-1.5">Attestation Hash</div>
              <div className="font-mono text-xs text-violet-400/80 break-all">{job.attestation_hash}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <Activity className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    }>
      <ProviderDashboard />
    </Suspense>
  );
}

function ProviderDashboard() {
  const searchParams = useSearchParams();
  const providerId = searchParams.get('id') ?? '';

  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [refreshed, setRefreshed] = useState('');

  const load = useCallback(async () => {
    if (!providerId) return;
    setLoading(true);
    try {
      const [pRes, jRes] = await Promise.all([
        fetch('/api/providers'),
        fetch(`/api/jobs?provider_id=${encodeURIComponent(providerId)}`),
      ]);
      const providers: ProviderInfo[] = pRes.ok ? await pRes.json() : [];
      const found = providers.find(p => p.id === providerId) ?? null;
      if (!found) setNotFound(true);
      setProvider(found);
      setJobs(jRes.ok ? await jRes.json() : []);
      setRefreshed(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => { load(); }, [load]);

  // ── No ID ──
  if (!providerId) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <Server className="w-10 h-10 text-white/20 mx-auto" />
          <div className="text-white/50">No provider ID supplied.</div>
          <div className="text-sm text-white/30">Use <span className="font-mono">/provider_dashboard?id=&lt;provider_id&gt;</span></div>
          <Link href="/dashboard" className="text-xs text-violet-400 hover:underline">← Consumer dashboard</Link>
        </div>
      </div>
    );
  }

  const completed = jobs.filter(j => j.status === 1);
  const totalEarned = completed.reduce((s, j) => s + j.amount, 0);
  const avgDuration = completed.filter(j => j.duration_ms).reduce((s, j, _, a) => s + (j.duration_ms ?? 0) / a.length, 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-400" />
            <span className="font-bold tracking-tight">ZKai</span>
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-sm text-white/50">Provider Dashboard</span>
          {refreshed && <span className="text-xs text-white/20">· refreshed {refreshed}</span>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="p-2 text-white/30 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/dashboard"
            className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Consumer view
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-8">

        {/* Not found */}
        {notFound && !loading && (
          <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-2xl p-6 text-center space-y-2">
            <div className="text-yellow-400 font-medium">Provider not found in registry</div>
            <div className="text-sm text-white/40">ID: <span className="font-mono">{providerId}</span></div>
            <div className="text-xs text-white/30">May be deregistered or the registry contract changed.</div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Earned"
            value={loading ? '—' : `${totalEarned} tNIGHT`}
            icon={Zap}
            accent="green"
          />
          <StatCard
            label="Jobs Completed"
            value={loading ? '—' : completed.length}
            sub={jobs.length ? `${Math.round((completed.length / jobs.length) * 100)}% success` : undefined}
            icon={CheckCircle}
            accent="green"
          />
          <StatCard
            label="Avg Latency"
            value={loading ? '—' : avgDuration ? `${(avgDuration / 1000).toFixed(1)}s` : '—'}
            icon={TrendingUp}
          />
          <StatCard
            label="Price"
            value={loading || !provider ? '—' : `${provider.price} tNIGHT`}
            sub="per request"
            icon={Cpu}
            accent="violet"
          />
        </div>

        {/* Node info */}
        {provider && <NodeStatusCard provider={provider} />}

        {/* Job history */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/70">
              Job History <span className="text-white/30 font-normal">({jobs.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="border border-white/10 rounded-2xl p-10 text-center text-white/30 text-sm">
              No jobs processed yet for this provider.
            </div>
          ) : (
            <div className="border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/10">
              {jobs.map(job => <JobRow key={job.id} job={job} />)}
            </div>
          )}
        </div>

      </main>

      <footer className="border-t border-white/10 px-6 py-3 text-xs text-white/20 flex items-center gap-4">
        <a href="https://github.com/Eshan276/zkai" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-white/50 transition-colors">
          <FileText className="w-3.5 h-3.5" />Docs & GitHub
        </a>
        <span>·</span>
        <span className="font-mono truncate">{providerId.slice(0, 20)}…</span>
      </footer>
    </div>
  );
}
