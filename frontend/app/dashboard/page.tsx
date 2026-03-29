'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Shield, RefreshCw, ExternalLink, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { Provider, Job } from '@/lib/indexer';

const STATUS_LABEL: Record<number, string> = { 0: 'Pending', 1: 'Completed', 2: 'Refunded' };
const STATUS_COLOR: Record<number, string> = {
  0: 'text-yellow-400 bg-yellow-950/50 border-yellow-500/20',
  1: 'text-green-400 bg-green-950/50 border-green-500/20',
  2: 'text-red-400 bg-red-950/50 border-red-500/20',
};
const STATUS_ICON: Record<number, typeof CheckCircle> = {
  0: Clock,
  1: CheckCircle,
  2: XCircle,
};

export default function DashboardPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'jobs' | 'providers'>('jobs');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, jRes] = await Promise.all([
        fetch('/api/providers'),
        fetch('/api/jobs'),
      ]);
      if (pRes.ok) setProviders(await pRes.json());
      if (jRes.ok) setJobs(await jRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const completedJobs = jobs.filter(j => j.status === 1);
  const totalSpent = completedJobs.reduce((s, j) => s + j.amount, 0);
  const pendingJobs = jobs.filter(j => j.status === 0).length;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-violet-400" />
            <span className="font-bold text-lg tracking-tight">ZKai</span>
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white/60 text-sm">Dashboard</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Jobs', value: jobs.length },
            { label: 'Completed', value: completedJobs.length },
            { label: 'Pending', value: pendingJobs },
            { label: 'Total Spent', value: `${totalSpent} DUST` },
          ].map(({ label, value }) => (
            <div key={label} className="border border-white/10 rounded-2xl p-5">
              <div className="text-2xl font-bold mb-1">{loading ? '—' : value}</div>
              <div className="text-sm text-white/40">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 w-fit">
          {(['jobs', 'providers'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-violet-600 text-white'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {tab} {tab === 'jobs' ? `(${jobs.length})` : `(${providers.length})`}
            </button>
          ))}
        </div>

        {/* Jobs tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-white/10 rounded-2xl p-5 animate-pulse bg-white/2 h-20" />
              ))
            ) : jobs.length === 0 ? (
              <div className="border border-white/10 rounded-2xl p-16 text-center text-white/30">
                No jobs found on-chain yet.
              </div>
            ) : (
              jobs.map(job => {
                const Icon = STATUS_ICON[job.status];
                const isExpanded = expandedJob === job.id;
                return (
                  <div key={job.id} className="border border-white/10 rounded-2xl overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-5 hover:bg-white/2 transition-colors text-left"
                      onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                    >
                      <div className="flex items-center gap-4">
                        <Icon className={`w-5 h-5 ${job.status === 1 ? 'text-green-400' : job.status === 2 ? 'text-red-400' : 'text-yellow-400'}`} />
                        <div>
                          <div className="font-mono text-sm text-white/60">{job.id.slice(0, 20)}…</div>
                          <div className="text-xs text-white/30 mt-0.5">Provider: {job.provider_id.slice(0, 16)}…</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-xs border px-2.5 py-1 rounded-full ${STATUS_COLOR[job.status]}`}>
                          {STATUS_LABEL[job.status]}
                        </span>
                        <span className="text-sm text-white/40">{job.amount} DUST</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-white/10 p-5 bg-white/2 space-y-3">
                        <div>
                          <div className="text-xs text-white/40 mb-1">Job ID</div>
                          <div className="font-mono text-sm text-white/70 break-all">{job.id}</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/40 mb-1">Provider ID</div>
                          <div className="font-mono text-sm text-white/70 break-all">{job.provider_id}</div>
                        </div>
                        <div>
                          <div className="text-xs text-white/40 mb-1">Attestation Hash</div>
                          {job.attestation_hash && job.attestation_hash !== '00000000000000000000000000000000' ? (
                            <div className="font-mono text-sm text-violet-400 break-all">{job.attestation_hash}</div>
                          ) : (
                            <div className="text-sm text-white/30">Not yet posted</div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-white/40 mb-1">Amount</div>
                          <div className="text-sm text-white/70">{job.amount} DUST</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Providers tab */}
        {activeTab === 'providers' && (
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="border border-white/10 rounded-2xl p-5 animate-pulse bg-white/2 h-24" />
              ))
            ) : providers.length === 0 ? (
              <div className="border border-white/10 rounded-2xl p-16 text-center text-white/30">
                No active providers on-chain.
              </div>
            ) : (
              providers.map(p => (
                <div key={p.id} className="border border-white/10 rounded-2xl p-5 hover:border-violet-500/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-mono text-sm text-white/40 mb-1">{p.id.slice(0, 20)}…</div>
                      <div className="font-semibold">{p.model}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs bg-green-950/60 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        Active
                      </span>
                      <a
                        href={`${p.endpoint}/health`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/30 hover:text-white/60 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-white/30 text-xs mb-1">Price</div>
                      <div className="text-white/70">{p.price} DUST/req</div>
                    </div>
                    <div>
                      <div className="text-white/30 text-xs mb-1">Reputation</div>
                      <div className="text-white/70">{(p.reputation * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-white/30 text-xs mb-1">Endpoint</div>
                      <div className="font-mono text-white/40 text-xs truncate">{p.endpoint}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
