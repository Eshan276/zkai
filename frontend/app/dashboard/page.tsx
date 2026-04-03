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
import { connectWallet, refreshWalletState, waitForExtension, type MidnightWalletState, type ConnectedAPI } from '@/lib/wallet';
import { callEscrow } from '@/lib/escrow';

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

function WalletButton({ onWalletChange, onApiChange }: { onWalletChange: (addr: string | null) => void; onApiChange?: (api: ConnectedAPI | null) => void }) {
  const [walletState, setWalletState] = useState<MidnightWalletState | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [hasExtension, setHasExtension] = useState<boolean | null>(null);
  const apiRef = useRef<Awaited<ReturnType<typeof connectWallet>>['api'] | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    waitForExtension(3000).then(ext => setHasExtension(!!ext));
  }, []);

  // Poll wallet balance every 15s when connected
  useEffect(() => {
    if (!walletState || !apiRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const fresh = await refreshWalletState(apiRef.current!);
        setWalletState(fresh);
      } catch {}
    }, 15_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [!!walletState]);

  async function connect() {
    setConnecting(true);
    setError('');
    try {
      const { api, state } = await connectWallet();
      apiRef.current = api;
      setWalletState(state);
      onWalletChange(state.address);
      onApiChange?.(api as unknown as ConnectedAPI);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConnecting(false);
    }
  }

  function disconnect() {
    if (pollRef.current) clearInterval(pollRef.current);
    apiRef.current = null;
    setWalletState(null);
    onWalletChange(null);
    onApiChange?.(null);
  }

  function copyAddress() {
    if (!walletState?.address) return;
    navigator.clipboard.writeText(walletState.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (walletState) {
    const short = `${walletState.address.slice(0, 16)}…${walletState.address.slice(-6)}`;
    const dust = walletState.dustBalance ?? BigInt(0);
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-sm text-white/70 font-mono">{short}</span>
          <button onClick={copyAddress} className="text-white/30 hover:text-white/70 transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <span className="text-white/20">·</span>
          <span className="text-sm text-white/50">{dust.toString()} DUST</span>
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

// ── Escrow card ───────────────────────────────────────────────────────────────

const BRIDGE_URL = process.env.NEXT_PUBLIC_BRIDGE_URL ?? 'http://localhost:7300';

function EscrowCard({ walletAddress, connectedAPI }: { walletAddress: string | null; connectedAPI: ConnectedAPI | null }) {
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');
  const [escrowBalance, setEscrowBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const fetchBalance = useCallback(async (api: ConnectedAPI) => {
    setBalanceLoading(true);
    try {
      const shielded = await api.getShieldedAddresses();
      const cpk = (shielded as any).shieldedCoinPublicKey;
      const res = await fetch(`/api/escrow/balance?coinPublicKey=${encodeURIComponent(cpk)}`);
      if (res.ok) {
        const { balance } = await res.json();
        setEscrowBalance(balance);
      }
    } catch {}
    setBalanceLoading(false);
  }, []);

  useEffect(() => {
    if (connectedAPI) fetchBalance(connectedAPI);
  }, [connectedAPI, fetchBalance]);

  async function handleDeposit() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    if (!connectedAPI) { setStatus('err'); setMsg('Wallet not connected'); return; }
    setStatus('loading');
    setMsg('Approve in Lace wallet…');
    try {
      await callEscrow(connectedAPI, 'deposit', BigInt(Math.floor(Number(amount))));
      setStatus('ok');
      setMsg('Deposited! Refreshing balance…');
      setAmount('');
      setTimeout(() => fetchBalance(connectedAPI), 5000);
    } catch (e: any) {
      setStatus('err');
      setMsg(e.message ?? 'Deposit failed');
    }
  }

  return (
    <div className="border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-purple-400" />
        <h2 className="text-sm font-semibold text-white">Escrow Balance</h2>
        {escrowBalance !== null && (
          <span className="ml-2 text-sm font-bold text-purple-300">
            {balanceLoading ? '…' : `${escrowBalance} DUST`}
          </span>
        )}
        <span className="text-xs text-white/30 ml-auto">Lock DUST for inference payments</span>
      </div>
      <p className="text-xs text-white/40">
        Deposit DUST once — every inference auto-deducts from your escrow balance.
        100 DUST per request.
      </p>
      {!walletAddress ? (
        <p className="text-xs text-yellow-400/70">Connect your wallet to deposit.</p>
      ) : (
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            placeholder="Amount (DUST)"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50"
          />
          <button
            onClick={handleDeposit}
            disabled={status === 'loading' || !amount}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {status === 'loading' ? 'Depositing…' : 'Deposit'}
          </button>
        </div>
      )}
      {msg && (
        <p className={`text-xs ${status === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>
      )}
    </div>
  );
}

function OverviewTab({ jobs, providers, loading, walletAddress, connectedAPI }: { jobs: Job[]; providers: Provider[]; loading: boolean; walletAddress: string | null; connectedAPI: ConnectedAPI | null }) {
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

      {/* Escrow */}
      <EscrowCard walletAddress={walletAddress} connectedAPI={connectedAPI} />

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

interface ApiKey { key: string; created_at: string; revoked: boolean; label: string; }

function KeysTab({ walletAddress, connectedAPI }: { walletAddress: string | null; connectedAPI: ConnectedAPI | null }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  const loadKeys = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/me?wallet=${encodeURIComponent(walletAddress)}`);
      if (res.ok) setKeys((await res.json()).keys ?? []);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  async function issueKey() {
    if (!walletAddress) return;
    setIssuing(true);
    setError('');
    try {
      // 1. Get a challenge nonce
      const chalRes = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletAddress }),
      });
      const { nonce } = await chalRes.json();

      // 2. Get coinPublicKey from Lace for escrow deduction lookups
      let coin_public_key: string | null = null;
      if (connectedAPI) {
        try {
          const shielded = await connectedAPI.getShieldedAddresses();
          coin_public_key = (shielded as any).shieldedCoinPublicKey ?? null;
        } catch {}
      }

      // 3. Verify (no full sig yet — wallet address is the proof of connection)
      const verRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletAddress, nonce, coin_public_key }),
      });
      if (!verRes.ok) {
        const e = await verRes.json();
        throw new Error(e.error ?? 'Failed to issue key');
      }
      await loadKeys();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIssuing(false);
    }
  }

  async function revokeKey(key: string) {
    if (!walletAddress) return;
    await fetch('/api/auth/me', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, wallet_address: walletAddress }),
    });
    await loadKeys();
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  }

  if (!walletAddress) {
    return (
      <div className="border border-white/10 rounded-2xl p-16 text-center space-y-3">
        <Wallet className="w-8 h-8 text-white/20 mx-auto" />
        <p className="text-white/40 text-sm">Connect your Midnight wallet to generate API keys.</p>
      </div>
    );
  }

  const activeKeys = keys.filter(k => !k.revoked);

  return (
    <div className="space-y-6">
      {/* Issue key */}
      <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.02]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold mb-1">Your API Keys</h3>
            <p className="text-sm text-white/40">
              One key works with all ZKai providers. Connect your wallet to generate.
            </p>
          </div>
          <button
            onClick={issueKey}
            disabled={issuing}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-xl transition-colors font-medium shrink-0"
          >
            <Key className="w-4 h-4" />
            {issuing ? 'Generating…' : 'Generate Key'}
          </button>
        </div>

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        {loading ? (
          <div className="space-y-2">
            {[1,2].map(i => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        ) : activeKeys.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-xl p-8 text-center text-white/30 text-sm">
            No active keys. Generate one above.
          </div>
        ) : (
          <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
            {activeKeys.map(k => (
              <div key={k.key} className="flex items-center justify-between px-4 py-3.5 hover:bg-white/2 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <Key className="w-4 h-4 text-violet-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-mono text-sm text-white/70 truncate">{k.key.slice(0, 28)}…</div>
                    <div className="text-xs text-white/30 mt-0.5">
                      Created {new Date(k.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    onClick={() => copyKey(k.key)}
                    className="p-1.5 text-white/30 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"
                    title="Copy"
                  >
                    {copiedKey === k.key ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => revokeKey(k.key)}
                    className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                    title="Revoke"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage */}
      <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.02]">
        <h3 className="font-semibold mb-3">Usage</h3>
        <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/5">
            <span className="text-xs text-white/30">Python SDK</span>
          </div>
          <pre className="p-4 text-sm text-white/60 overflow-x-auto"><code>{`from zkai import ZKai

client = ZKai(
    api_key="${activeKeys[0]?.key ?? '<your-key>'}",
    provider_endpoint="https://provider.example.com",
)

resp = client.chat.completions.create(
    model="qwen2.5-1.5b",
    messages=[{"role": "user", "content": "Hello!"}],
)
print(resp.choices[0].message.content)`}</code></pre>
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
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connectedAPI, setConnectedAPI] = useState<ConnectedAPI | null>(null);

  const load = useCallback(async (wallet?: string | null) => {
    setLoading(true);
    try {
      const w = wallet ?? walletAddress;
      const jobsUrl = w ? `/api/jobs?wallet=${encodeURIComponent(w)}` : '/api/jobs';
      const [pRes, jRes] = await Promise.all([fetch('/api/providers'), fetch(jobsUrl)]);
      if (pRes.ok) setProviders(await pRes.json());
      if (jRes.ok) setJobs(await jRes.json());
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

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
            <WalletButton onWalletChange={(addr) => { setWalletAddress(addr); load(addr); }} onApiChange={setConnectedAPI} />
            <button
              onClick={() => load()}
              disabled={loading}
              className="p-2 text-white/30 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {tab === 'overview' && <OverviewTab jobs={jobs} providers={providers} loading={loading} walletAddress={walletAddress} connectedAPI={connectedAPI} />}
          {tab === 'activity' && <ActivityTab jobs={jobs} loading={loading} />}
          {tab === 'models' && <ModelsTab providers={providers} loading={loading} />}
          {tab === 'keys' && <KeysTab walletAddress={walletAddress} connectedAPI={connectedAPI} />}
        </main>
      </div>
    </div>
  );
}
