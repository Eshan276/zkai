'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Shield, RefreshCw, ExternalLink, CheckCircle, Clock, XCircle,
  LayoutDashboard, Cpu, FileText, Key, ChevronRight,
  Wallet, LogOut, Copy, Check, AlertTriangle, Activity,
  TrendingUp, Zap, Lock,
} from 'lucide-react';
import type { Provider, Job } from '@/lib/indexer';
import { connectWallet, getWalletExtension, type MidnightWalletState } from '@/lib/wallet';

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'activity' | 'models' | 'keys';

const JOB_STATUS = ['Pending', 'Completed', 'Refunded'] as const;
const JOB_STATUS_COLOR = [
  'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  'text-green-400 bg-green-500/10 border-green-500/20',
  'text-red-400 bg-red-500/10 border-red-500/20',
];
const JOB_STATUS_ICON = [Clock, CheckCircle, XCircle];

// ── Wallet button ─────────────────────────────────────────────────────────────

function WalletButton() {
  const [walletState, setWalletState] = useState<MidnightWalletState | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [hasExtension, setHasExtension] = useState<boolean | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Give extension time to inject
    const timer = setTimeout(() => {
      setHasExtension(!!getWalletExtension());
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  async function connect() {
    setConnecting(true);
    setError('');
    try {
      const { api, state } = await connectWallet();
      setWalletState(state);
      // Subscribe to live updates
      const sub = api.state().subscribe(setWalletState);
      unsubRef.current = () => sub.unsubscribe();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConnecting(false);
    }
  }

  function disconnect() {
    unsubRef.current?.();
    setWalletState(null);
  }

  function copyAddress() {
    if (!walletState?.address) return;
    navigator.clipboard.writeText(walletState.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (walletState) {
    const short = `${walletState.address.slice(0, 12)}…${walletState.address.slice(-6)}`;
    const dust = walletState.balances?.['DUST'] ?? BigInt(0);
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-sm text-white/70 font-mono">{short}</span>
          <button onClick={copyAddress} className="text-white/30 hover:text-white/70 transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <span className="text-white/20">·</span>
          <span className="text-sm text-white/50">{dust.toLocaleString()} DUST</span>
        </div>
        <button
          onClick={disconnect}
          className="p-2 text-white/30 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"
          title="Disconnect"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (hasExtension === false) {
    return (
      <a
        href="https://chrome.google.com/webstore/search/midnight%20lace"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm bg-white/5 border border-white/10 hover:border-white/20 text-white/50 hover:text-white px-4 py-2 rounded-xl transition-colors"
      >
        <AlertTriangle className="w-4 h-4 text-yellow-400" />
        Install Lace Wallet
      </a>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        disabled={connecting || hasExtension === null}
        className="flex items-center gap-2 text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl transition-colors font-medium"
      >
        <Wallet className="w-4 h-4" />
        {connecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
      {error && <div className="text-xs text-red-400 max-w-48 text-right">{error}</div>}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'models', label: 'Models', icon: Cpu },
    { id: 'keys', label: 'API Keys', icon: Key },
  ];

  return (
    <aside className="w-56 shrink-0 border-r border-white/10 flex flex-col">
      <div className="p-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-violet-400" />
          <span className="font-bold tracking-tight">ZKai</span>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <a
          href="https://github.com/Eshan276/zkai"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          Docs & GitHub
        </a>
      </div>
    </aside>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, trend }: {
  label: string; value: string | number; sub?: string;
  icon: typeof Activity; trend?: 'up' | 'neutral';
}) {
  return (
    <div className="border border-white/10 rounded-2xl p-5 bg-white/[0.02]">
      <div className="flex items-start justify-between mb-4">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
          <Icon className="w-4 h-4 text-violet-400" />
        </div>
        {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-400" />}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm text-white/40">{label}</div>
      {sub && <div className="text-xs text-white/25 mt-1">{sub}</div>}
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ jobs, providers, loading }: { jobs: Job[]; providers: Provider[]; loading: boolean }) {
  const completed = jobs.filter(j => j.status === 1);
  const totalDust = completed.reduce((s, j) => s + j.amount, 0);
  const successRate = jobs.length ? Math.round((completed.length / jobs.length) * 100) : 0;

  const recent = [...jobs].slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={loading ? '—' : jobs.length} icon={Activity} trend="up" />
        <StatCard label="Completed" value={loading ? '—' : completed.length} sub={`${successRate}% success rate`} icon={CheckCircle} />
        <StatCard label="Total Spent" value={loading ? '—' : `${totalDust} DUST`} icon={Zap} />
        <StatCard label="Active Providers" value={loading ? '—' : providers.length} icon={Cpu} trend="up" />
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/70">Recent Activity</h2>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="border border-white/10 rounded-2xl p-10 text-center text-white/30 text-sm">
            No activity yet. Make your first request with the Python SDK.
          </div>
        ) : (
          <div className="border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/10">
            {recent.map(job => {
              const Icon = JOB_STATUS_ICON[job.status];
              return (
                <div key={job.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/2 transition-colors">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${job.status === 1 ? 'text-green-400' : job.status === 2 ? 'text-red-400' : 'text-yellow-400'}`} />
                    <div>
                      <div className="text-sm font-mono text-white/60">{job.id.slice(0, 24)}…</div>
                      <div className="text-xs text-white/30">Provider {job.provider_id.slice(0, 12)}…</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs border px-2.5 py-0.5 rounded-full ${JOB_STATUS_COLOR[job.status]}`}>
                      {JOB_STATUS[job.status]}
                    </span>
                    <span className="text-sm text-white/40">{job.amount} DUST</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Activity tab ──────────────────────────────────────────────────────────────

function ActivityTab({ jobs, loading }: { jobs: Job[]; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<-1 | 0 | 1 | 2>(-1);

  const filtered = filter === -1 ? jobs : jobs.filter(j => j.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/70">{filtered.length} job{filtered.length !== 1 ? 's' : ''}</h2>
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {([[-1, 'All'], [1, 'Completed'], [0, 'Pending'], [2, 'Refunded']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                filter === val ? 'bg-white/10 text-white font-medium' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-white/10 rounded-2xl p-12 text-center text-white/30 text-sm">
          No jobs match this filter.
        </div>
      ) : (
        <div className="border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/10">
          {filtered.map(job => {
            const Icon = JOB_STATUS_ICON[job.status];
            const isOpen = expanded === job.id;
            const hasAttestation = job.attestation_hash && !/^0+$/.test(job.attestation_hash);
            return (
              <div key={job.id}>
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors text-left"
                  onClick={() => setExpanded(isOpen ? null : job.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${job.status === 1 ? 'text-green-400' : job.status === 2 ? 'text-red-400' : 'text-yellow-400'}`} />
                    <div className="min-w-0">
                      <div className="text-sm font-mono text-white/70 truncate">{job.id.slice(0, 32)}…</div>
                      <div className="text-xs text-white/30 mt-0.5">
                        {hasAttestation ? (
                          <span className="flex items-center gap-1">
                            <Lock className="w-3 h-3 text-violet-400" />
                            Attestation verified
                          </span>
                        ) : 'No attestation'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <span className={`text-xs border px-2.5 py-0.5 rounded-full ${JOB_STATUS_COLOR[job.status]}`}>
                      {JOB_STATUS[job.status]}
                    </span>
                    <span className="text-sm text-white/40 tabular-nums">{job.amount} DUST</span>
                    <ChevronRight className={`w-4 h-4 text-white/20 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 bg-white/[0.015] border-t border-white/5 space-y-4">
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div>
                        <div className="text-xs text-white/30 mb-1.5">Job ID</div>
                        <div className="font-mono text-xs text-white/60 break-all">{job.id}</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/30 mb-1.5">Provider ID</div>
                        <div className="font-mono text-xs text-white/60 break-all">{job.provider_id}</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/30 mb-1.5">Amount</div>
                        <div className="text-sm text-white/70">{job.amount} DUST</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/30 mb-1.5">Status</div>
                        <span className={`text-xs border px-2.5 py-0.5 rounded-full ${JOB_STATUS_COLOR[job.status]}`}>
                          {JOB_STATUS[job.status]}
                        </span>
                      </div>
                    </div>
                    {hasAttestation && (
                      <div>
                        <div className="text-xs text-white/30 mb-1.5">Attestation Hash</div>
                        <div className="font-mono text-xs text-violet-400 break-all bg-violet-950/30 border border-violet-500/20 rounded-lg p-3">
                          {job.attestation_hash}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Models tab ────────────────────────────────────────────────────────────────

function ModelsTab({ providers, loading }: { providers: Provider[]; loading: boolean }) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-white/70">{providers.length} active provider{providers.length !== 1 ? 's' : ''}</h2>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      ) : providers.length === 0 ? (
        <div className="border border-white/10 rounded-2xl p-12 text-center text-white/30 text-sm">
          No active providers on-chain.
        </div>
      ) : (
        <div className="grid gap-3">
          {providers.map(p => (
            <div key={p.id} className="border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors bg-white/[0.02]">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="font-semibold">{p.model}</span>
                  </div>
                  <div className="font-mono text-xs text-white/30">{p.id.slice(0, 24)}…</div>
                </div>
                <a
                  href={`${p.endpoint}/health`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors border border-white/10 hover:border-white/20 px-2.5 py-1 rounded-lg"
                >
                  Health <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-white/30 mb-1">Price</div>
                  <div className="font-semibold">{p.price} <span className="text-white/40 font-normal text-xs">DUST/req</span></div>
                </div>
                <div>
                  <div className="text-xs text-white/30 mb-1">Reputation</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${p.reputation * 100}%` }} />
                    </div>
                    <span className="text-xs text-white/50 tabular-nums">{(p.reputation * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/30 mb-1">Endpoint</div>
                  <div className="font-mono text-xs text-white/40 truncate">{p.endpoint}</div>
                </div>
              </div>
              {/* Quick-use snippet */}
              <div className="mt-4 bg-black/40 border border-white/5 rounded-xl p-3">
                <div className="text-xs text-white/20 mb-2">Quick start</div>
                <pre className="text-xs text-white/50 overflow-x-auto"><code>{`ZKai(api_key="…", provider_endpoint="${p.endpoint}")`}</code></pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── API Keys tab ──────────────────────────────────────────────────────────────

function KeysTab() {
  return (
    <div className="space-y-6">
      <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.02]">
        <h3 className="font-semibold mb-1">API Keys</h3>
        <p className="text-sm text-white/40 mb-5">
          API keys are managed by your provider via the <code className="bg-white/10 px-1 rounded">zkai keys</code> CLI command.
          Share keys with consumers who you want to grant access.
        </p>
        <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/5">
            <span className="text-xs text-white/30">Provider CLI</span>
          </div>
          <pre className="p-4 text-sm text-white/60 overflow-x-auto"><code>{`# List all configured keys
zkai keys list

# Generate 1 new key
zkai keys add

# Generate N keys
zkai keys add --count 3

# Remove a specific key
zkai keys remove <key>

# Replace all keys
zkai keys rotate`}</code></pre>
        </div>
      </div>

      <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.02]">
        <h3 className="font-semibold mb-1">Consumer Usage</h3>
        <p className="text-sm text-white/40 mb-4">Pass your key via the SDK or HTTP header.</p>
        <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/5">
            <span className="text-xs text-white/30">Python SDK</span>
          </div>
          <pre className="p-4 text-sm text-white/60 overflow-x-auto"><code>{`from zkai import ZKai

client = ZKai(
    api_key="<your-key>",
    provider_endpoint="https://provider.example.com",
)

resp = client.chat.completions.create(
    model="qwen2.5-1.5b",
    messages=[{"role": "user", "content": "Hello!"}],
)`}</code></pre>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, jRes] = await Promise.all([fetch('/api/providers'), fetch('/api/jobs')]);
      if (pRes.ok) setProviders(await pRes.json());
      if (jRes.ok) setJobs(await jRes.json());
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <Sidebar tab={tab} setTab={setTab} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="border-b border-white/10 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm text-white/40">
            <span className="capitalize">{tab}</span>
            {lastRefreshed && (
              <span className="text-white/20 text-xs">
                · refreshed {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <WalletButton />
            <button
              onClick={load}
              disabled={loading}
              className="p-2 text-white/30 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {tab === 'overview' && <OverviewTab jobs={jobs} providers={providers} loading={loading} />}
          {tab === 'activity' && <ActivityTab jobs={jobs} loading={loading} />}
          {tab === 'models' && <ModelsTab providers={providers} loading={loading} />}
          {tab === 'keys' && <KeysTab />}
        </main>
      </div>
    </div>
  );
}
