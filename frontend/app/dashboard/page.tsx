// 'use client';

// import { useState, useEffect, useCallback, useRef } from 'react';
// import Link from 'next/link';
// import {
//   Shield, RefreshCw, ExternalLink, CheckCircle, Clock, XCircle,
//   LayoutDashboard, Cpu, FileText, Key, ChevronRight,
//   Wallet, LogOut, Copy, Check, AlertTriangle, Activity,
//   TrendingUp, Zap, Lock,
// } from 'lucide-react';
// import type { Provider, Job } from '@/lib/indexer';
// import { connectWallet, refreshWalletState, waitForExtension, type MidnightWalletState, type ConnectedAPI } from '@/lib/wallet';
// import { callEscrow } from '@/lib/escrow';
// import { Navigation } from '@/components/navigation';

// // ── Types ─────────────────────────────────────────────────────────────────────

// type Tab = 'overview' | 'activity' | 'models' | 'keys';

// const JOB_STATUS = ['Pending', 'Completed', 'Refunded'] as const;
// const JOB_STATUS_COLOR = [
//   'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
//   'text-green-400 bg-green-500/10 border-green-500/20',
//   'text-red-400 bg-red-500/10 border-red-500/20',
// ];
// const JOB_STATUS_ICON = [Clock, CheckCircle, XCircle];

// // ── Wallet button ─────────────────────────────────────────────────────────────

// function WalletButton({ onWalletChange, onApiChange }: { onWalletChange: (addr: string | null) => void; onApiChange?: (api: ConnectedAPI | null) => void }) {
//   const [walletState, setWalletState] = useState<MidnightWalletState | null>(null);
//   const [connecting, setConnecting] = useState(false);
//   const [error, setError] = useState('');
//   const [copied, setCopied] = useState(false);
//   const [hasExtension, setHasExtension] = useState<boolean | null>(null);
//   const apiRef = useRef<Awaited<ReturnType<typeof connectWallet>>['api'] | null>(null);
//   const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

//   useEffect(() => {
//     waitForExtension(3000).then(ext => setHasExtension(!!ext));
//   }, []);

//   useEffect(() => {
//     if (!walletState || !apiRef.current) return;
//     pollRef.current = setInterval(async () => {
//       try {
//         const fresh = await refreshWalletState(apiRef.current!);
//         setWalletState(fresh);
//       } catch {}
//     }, 15_000);
//     return () => { if (pollRef.current) clearInterval(pollRef.current); };
//   }, [!!walletState]);

//   async function connect() {
//     setConnecting(true);
//     setError('');
//     try {
//       const { api, state } = await connectWallet();
//       apiRef.current = api;
//       setWalletState(state);
//       onWalletChange(state.address);
//       onApiChange?.(api as unknown as ConnectedAPI);
//     } catch (e: any) {
//       setError(e.message);
//     } finally {
//       setConnecting(false);
//     }
//   }

//   function disconnect() {
//     if (pollRef.current) clearInterval(pollRef.current);
//     apiRef.current = null;
//     setWalletState(null);
//     onWalletChange(null);
//     onApiChange?.(null);
//   }

//   function copyAddress() {
//     if (!walletState?.address) return;
//     navigator.clipboard.writeText(walletState.address);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 2000);
//   }

//   if (walletState) {
//     const short = `${walletState.address.slice(0, 16)}…${walletState.address.slice(-6)}`;
//     const dust = walletState.dustBalance ?? BigInt(0);
//     const TNIGHT_KEY = '0000000000000000000000000000000000000000000000000000000000000000';
//     const tnight = walletState.unshieldedBalances?.[TNIGHT_KEY] ?? BigInt(0);
//     return (
//       <div className="flex items-center gap-3">
//         <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
//           <div className="w-2 h-2 rounded-full bg-green-400" />
//           <span className="text-sm text-white/70 font-mono">{short}</span>
//           <button onClick={copyAddress} className="text-white/30 hover:text-white/70 transition-colors">
//             {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
//           </button>
//           <span className="text-white/20">·</span>
//           <span className="text-sm text-white/50">{tnight.toString()} tNIGHT</span>
//           <span className="text-white/20">·</span>
//           <span className="text-sm text-white/40">{dust.toString()} DUST</span>
//         </div>
//         <button
//           onClick={disconnect}
//           className="p-2 text-white/30 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"
//           title="Disconnect"
//         >
//           <LogOut className="w-4 h-4" />
//         </button>
//       </div>
//     );
//   }

//   if (hasExtension === false) {
//     return (
//       <a
//         href="https://chrome.google.com/webstore/search/midnight%20lace"
//         target="_blank"
//         rel="noopener noreferrer"
//         className="flex items-center gap-2 text-sm bg-white/5 border border-white/10 hover:border-white/20 text-white/50 hover:text-white px-4 py-2 rounded-xl transition-colors"
//       >
//         <AlertTriangle className="w-4 h-4 text-yellow-400" />
//         Install Lace Wallet
//       </a>
//     );
//   }

//   return (
//     <div className="flex flex-col items-end gap-1">
//       <button
//         onClick={connect}
//         disabled={connecting || hasExtension === null}
//         className="flex items-center gap-2 text-sm bg-white text-black hover:bg-white/90 disabled:opacity-50 px-4 py-2 rounded-xl transition-colors font-semibold"
//       >
//         <Wallet className="w-4 h-4" />
//         {connecting ? 'Connecting…' : 'Connect Wallet'}
//       </button>
//       {error && <div className="text-xs text-red-400 max-w-48 text-right">{error}</div>}
//     </div>
//   );
// }

// // ── Sidebar ───────────────────────────────────────────────────────────────────

// function Sidebar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
//   const items: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
//     { id: 'overview', label: 'Overview', icon: LayoutDashboard },
//     { id: 'activity', label: 'Activity', icon: Activity },
//     { id: 'models', label: 'Models', icon: Cpu },
//     { id: 'keys', label: 'API Keys', icon: Key },
//   ];

//   return (
//     <aside className="w-56 shrink-0 border-r border-white/10 flex flex-col">
//       <div className="p-4 border-b border-white/10">
//         <Link href="/" className="flex items-center gap-2">
//           <Shield className="w-5 h-5 text-violet-400" />
//           <span className="font-bold tracking-tight">ZKai</span>
//         </Link>
//       </div>
//       <nav className="flex-1 p-3 space-y-0.5">
//         {items.map(({ id, label, icon: Icon }) => (
//           <button
//             key={id}
//             onClick={() => setTab(id)}
//             className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
//               tab === id
//                 ? 'bg-white/10 text-white'
//                 : 'text-white/40 hover:text-white/70 hover:bg-white/5'
//             }`}
//           >
//             <Icon className="w-4 h-4" />
//             {label}
//           </button>
//         ))}
//       </nav>
//       <div className="p-3 border-t border-white/10">
//         <a
//           href="https://github.com/Eshan276/zkai"
//           target="_blank"
//           rel="noopener noreferrer"
//           className="flex items-center gap-2 px-3 py-2 text-xs text-white/30 hover:text-white/60 transition-colors"
//         >
//           <FileText className="w-3.5 h-3.5" />
//           Docs & GitHub
//         </a>
//       </div>
//     </aside>
//   );
// }

// // ── Stat card ──────────────────────────────────────────────────────────────────

// function StatCard({ label, value, sub, icon: Icon, trend }: {
//   label: string; value: string | number; sub?: string;
//   icon: typeof Activity; trend?: 'up' | 'neutral';
// }) {
//   return (
//     <div className="border border-white/10 rounded-2xl p-5 bg-white/2">
//       <div className="flex items-start justify-between mb-4">
//         <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
//           <Icon className="w-4 h-4 text-violet-400" />
//         </div>
//         {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-400" />}
//       </div>
//       <div className="text-2xl font-bold mb-1">{value}</div>
//       <div className="text-sm text-white/40">{label}</div>
//       {sub && <div className="text-xs text-white/25 mt-1">{sub}</div>}
//     </div>
//   );
// }

// // ── Escrow card ───────────────────────────────────────────────────────────────

// function EscrowCard({ walletAddress, connectedAPI }: { walletAddress: string | null; connectedAPI: ConnectedAPI | null }) {
//   const [amount, setAmount] = useState('');
//   const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
//   const [msg, setMsg] = useState('');
//   const [escrowBalance, setEscrowBalance] = useState<string | null>(null);
//   const [balanceLoading, setBalanceLoading] = useState(false);

//   const fetchBalance = useCallback(async (api: ConnectedAPI) => {
//     setBalanceLoading(true);
//     try {
//       const shielded = await api.getShieldedAddresses();
//       const cpk = (shielded as any).shieldedCoinPublicKey;
//       const res = await fetch(`/api/escrow/balance?coinPublicKey=${encodeURIComponent(cpk)}`);
//       if (res.ok) {
//         const { balance } = await res.json();
//         setEscrowBalance(balance);
//       }
//     } catch {}
//     setBalanceLoading(false);
//   }, []);

//   useEffect(() => {
//     if (connectedAPI) fetchBalance(connectedAPI);
//   }, [connectedAPI, fetchBalance]);

//   async function handleDeposit() {
//     if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
//     if (!connectedAPI) { setStatus('err'); setMsg('Wallet not connected'); return; }
//     setStatus('loading');
//     setMsg('Approve in Lace wallet…');
//     try {
//       await callEscrow(connectedAPI, 'deposit', BigInt(Math.floor(Number(amount))));
//       setStatus('ok');
//       setMsg('Deposited! Refreshing balance…');
//       setAmount('');
//       setTimeout(() => fetchBalance(connectedAPI), 5000);
//     } catch (e: any) {
//       setStatus('err');
//       setMsg(e.message ?? 'Deposit failed');
//     }
//   }

//   return (
//     <div className="border border-white/10 rounded-2xl p-5 space-y-4">
//       <div className="flex items-center gap-2">
//         <Lock className="w-4 h-4 text-purple-400" />
//         <h2 className="text-sm font-semibold text-white">Escrow Balance</h2>
//         {escrowBalance !== null && (
//           <span className="ml-2 text-sm font-bold text-purple-300">
//             {balanceLoading ? '…' : `${escrowBalance} tNIGHT`}
//           </span>
//         )}
//         <span className="text-xs text-white/30 ml-auto">Lock tNIGHT for inference payments</span>
//       </div>
//       <p className="text-xs text-white/40">
//         Deposit tNIGHT once — every inference auto-deducts from your escrow balance.
//         100 tNIGHT per request.
//       </p>
//       {!walletAddress ? (
//         <p className="text-xs text-yellow-400/70">Connect your wallet to deposit.</p>
//       ) : (
//         <div className="flex gap-2">
//           <input
//             type="number"
//             min="1"
//             placeholder="Amount (tNIGHT)"
//             value={amount}
//             onChange={e => setAmount(e.target.value)}
//             className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50"
//           />
//           <button
//             onClick={handleDeposit}
//             disabled={status === 'loading' || !amount}
//             className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
//           >
//             {status === 'loading' ? 'Depositing…' : 'Deposit'}
//           </button>
//         </div>
//       )}
//       {msg && (
//         <p className={`text-xs ${status === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>
//       )}
//     </div>
//   );
// }

// // ── Overview tab ──────────────────────────────────────────────────────────────

// function OverviewTab({ jobs, providers, loading, walletAddress, connectedAPI }: { jobs: Job[]; providers: Provider[]; loading: boolean; walletAddress: string | null; connectedAPI: ConnectedAPI | null }) {
//   const completed = jobs.filter(j => j.status === 1);
//   const totalSpent = completed.reduce((s, j) => s + j.amount, 0);
//   const successRate = jobs.length ? Math.round((completed.length / jobs.length) * 100) : 0;
//   const recent = [...jobs].slice(0, 5);

//   return (
//     <div className="space-y-8">
//       <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
//         <StatCard label="Total Requests" value={loading ? '—' : jobs.length} icon={Activity} trend="up" />
//         <StatCard label="Completed" value={loading ? '—' : completed.length} sub={`${successRate}% success rate`} icon={CheckCircle} />
//         <StatCard label="Total Spent" value={loading ? '—' : `${totalSpent} tNIGHT`} icon={Zap} />
//         <StatCard label="Active Providers" value={loading ? '—' : providers.length} icon={Cpu} trend="up" />
//       </div>

//       <EscrowCard walletAddress={walletAddress} connectedAPI={connectedAPI} />

//       <div>
//         <div className="flex items-center justify-between mb-4">
//           <h2 className="text-sm font-semibold text-white/70">Recent Activity</h2>
//         </div>
//         {loading ? (
//           <div className="space-y-2">
//             {Array.from({ length: 4 }).map((_, i) => (
//               <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
//             ))}
//           </div>
//         ) : recent.length === 0 ? (
//           <div className="border border-white/10 rounded-2xl p-10 text-center text-white/30 text-sm">
//             No activity yet. Make your first request with the Python SDK.
//           </div>
//         ) : (
//           <div className="border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/10">
//             {recent.map(job => {
//               const Icon = JOB_STATUS_ICON[job.status];
//               return (
//                 <div key={job.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/2 transition-colors">
//                   <div className="flex items-center gap-3">
//                     <Icon className={`w-4 h-4 ${job.status === 1 ? 'text-green-400' : job.status === 2 ? 'text-red-400' : 'text-yellow-400'}`} />
//                     <div>
//                       <div className="text-sm font-mono text-white/60">{job.id.slice(0, 24)}…</div>
//                       <div className="text-xs text-white/30">Provider {job.provider_id.slice(0, 12)}…</div>
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-4">
//                     <span className={`text-xs border px-2.5 py-0.5 rounded-full ${JOB_STATUS_COLOR[job.status]}`}>
//                       {JOB_STATUS[job.status]}
//                     </span>
//                     <span className="text-sm text-white/40">{job.amount} tNIGHT</span>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// // ── Activity tab ──────────────────────────────────────────────────────────────

// function ActivityTab({ jobs, loading }: { jobs: Job[]; loading: boolean }) {
//   const [expanded, setExpanded] = useState<string | null>(null);
//   const [filter, setFilter] = useState<-1 | 0 | 1 | 2>(-1);

//   const filtered = filter === -1 ? jobs : jobs.filter(j => j.status === filter);

//   return (
//     <div className="space-y-4">
//       <div className="flex items-center justify-between">
//         <h2 className="text-sm font-semibold text-white/70">{filtered.length} job{filtered.length !== 1 ? 's' : ''}</h2>
//         <div className="flex gap-1 bg-white/5 rounded-lg p-1">
//           {([[-1, 'All'], [1, 'Completed'], [0, 'Pending'], [2, 'Refunded']] as const).map(([val, label]) => (
//             <button
//               key={val}
//               onClick={() => setFilter(val)}
//               className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
//                 filter === val ? 'bg-white/10 text-white font-medium' : 'text-white/40 hover:text-white/70'
//               }`}
//             >
//               {label}
//             </button>
//           ))}
//         </div>
//       </div>

//       {loading ? (
//         <div className="space-y-2">
//           {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}
//         </div>
//       ) : filtered.length === 0 ? (
//         <div className="border border-white/10 rounded-2xl p-12 text-center text-white/30 text-sm">
//           No jobs match this filter.
//         </div>
//       ) : (
//         <div className="border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/10">
//           {filtered.map(job => {
//             const Icon = JOB_STATUS_ICON[job.status];
//             const isOpen = expanded === job.id;
//             const hasAttestation = job.attestation_hash && !/^0+$/.test(job.attestation_hash);
//             return (
//               <div key={job.id}>
//                 <button
//                   className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors text-left"
//                   onClick={() => setExpanded(isOpen ? null : job.id)}
//                 >
//                   <div className="flex items-center gap-3 min-w-0">
//                     <Icon className={`w-4 h-4 shrink-0 ${job.status === 1 ? 'text-green-400' : job.status === 2 ? 'text-red-400' : 'text-yellow-400'}`} />
//                     <div className="min-w-0">
//                       <div className="text-sm font-mono text-white/70 truncate">{job.id.slice(0, 32)}…</div>
//                       <div className="text-xs text-white/30 mt-0.5">
//                         {hasAttestation ? (
//                           <span className="flex items-center gap-1">
//                             <Lock className="w-3 h-3 text-violet-400" />
//                             Attestation verified
//                           </span>
//                         ) : 'No attestation'}
//                       </div>
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-4 shrink-0 ml-4">
//                     <span className={`text-xs border px-2.5 py-0.5 rounded-full ${JOB_STATUS_COLOR[job.status]}`}>
//                       {JOB_STATUS[job.status]}
//                     </span>
//                     <span className="text-sm text-white/40 tabular-nums">{job.amount} tNIGHT</span>
//                     <ChevronRight className={`w-4 h-4 text-white/20 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
//                   </div>
//                 </button>

//                 {isOpen && (
//                   <div className="px-5 pb-5 bg-white/1.5 border-t border-white/5 space-y-4">
//                     <div className="grid grid-cols-2 gap-4 pt-4">
//                       <div>
//                         <div className="text-xs text-white/30 mb-1.5">Job ID</div>
//                         <div className="font-mono text-xs text-white/60 break-all">{job.id}</div>
//                       </div>
//                       <div>
//                         <div className="text-xs text-white/30 mb-1.5">Provider ID</div>
//                         <div className="font-mono text-xs text-white/60 break-all">{job.provider_id}</div>
//                       </div>
//                       <div>
//                         <div className="text-xs text-white/30 mb-1.5">Amount</div>
//                         <div className="text-sm text-white/70">{job.amount} tNIGHT</div>
//                       </div>
//                       <div>
//                         <div className="text-xs text-white/30 mb-1.5">Status</div>
//                         <span className={`text-xs border px-2.5 py-0.5 rounded-full ${JOB_STATUS_COLOR[job.status]}`}>
//                           {JOB_STATUS[job.status]}
//                         </span>
//                       </div>
//                     </div>

//                     {(job.prompt_tokens != null || job.duration_ms != null) && (
//                       <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-white/3 border border-white/5 rounded-xl p-4">
//                         {job.prompt_tokens != null && (
//                           <div className="text-center">
//                             <div className="text-lg font-semibold text-white/80 tabular-nums">{job.prompt_tokens}</div>
//                             <div className="text-xs text-white/30 mt-0.5">Input tokens</div>
//                           </div>
//                         )}
//                         {job.completion_tokens != null && (
//                           <div className="text-center">
//                             <div className="text-lg font-semibold text-white/80 tabular-nums">{job.completion_tokens}</div>
//                             <div className="text-xs text-white/30 mt-0.5">Output tokens</div>
//                           </div>
//                         )}
//                         {job.duration_ms != null && (
//                           <div className="text-center">
//                             <div className="text-lg font-semibold text-white/80 tabular-nums">
//                               {job.duration_ms >= 1000 ? `${(job.duration_ms / 1000).toFixed(1)}s` : `${job.duration_ms}ms`}
//                             </div>
//                             <div className="text-xs text-white/30 mt-0.5">Duration</div>
//                           </div>
//                         )}
//                         {job.cpu_percent != null && (
//                           <div className="text-center">
//                             <div className="text-lg font-semibold text-white/80 tabular-nums">{job.cpu_percent}%</div>
//                             <div className="text-xs text-white/30 mt-0.5">Avg CPU</div>
//                           </div>
//                         )}
//                         {job.ram_mb != null && (
//                           <div className="text-center">
//                             <div className="text-lg font-semibold text-white/80 tabular-nums">
//                               {job.ram_mb >= 1024 ? `${(job.ram_mb / 1024).toFixed(1)}GB` : `${job.ram_mb}MB`}
//                             </div>
//                             <div className="text-xs text-white/30 mt-0.5">Avg RAM</div>
//                           </div>
//                         )}
//                       </div>
//                     )}

//                     {hasAttestation && (
//                       <div>
//                         <div className="text-xs text-white/30 mb-1.5">Attestation Hash</div>
//                         <div className="font-mono text-xs text-violet-400 break-all bg-violet-950/30 border border-violet-500/20 rounded-lg p-3">
//                           {job.attestation_hash}
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Provider stats ────────────────────────────────────────────────────────────

// interface ProviderStats {
//   jobs: number;
//   avgLatency: number | null;
//   throughput: number | null;
//   avgCpu: number | null;
//   avgRam: number | null;
//   hw: { cpu_model?: string; cpu_cores?: number; ram_total_mb?: number } | null;
// }

// function useProviderStats(providerId: string, hw: ProviderStats['hw']): ProviderStats | null {
//   const [stats, setStats] = useState<ProviderStats | null>(null);
//   useEffect(() => {
//     fetch(`/api/jobs?provider_id=${providerId}`)
//       .then(r => r.ok ? r.json() : [])
//       .then((jobs: any[]) => {
//         const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
//         if (!jobs.length) { setStats({ jobs: 0, avgLatency: null, throughput: null, avgCpu: null, avgRam: null, hw }); return; }
//         const withLatency = jobs.filter(j => j.duration_ms != null);
//         const withTokens  = jobs.filter(j => j.completion_tokens != null && j.duration_ms != null && j.duration_ms > 0);
//         const withCpu     = jobs.filter(j => j.cpu_percent != null);
//         const withRam     = jobs.filter(j => j.ram_mb != null);
//         setStats({
//           jobs: jobs.length,
//           avgLatency: avg(withLatency.map(j => j.duration_ms)),
//           throughput: avg(withTokens.map(j => (j.completion_tokens / j.duration_ms) * 1000)),
//           avgCpu: avg(withCpu.map(j => j.cpu_percent)),
//           avgRam: avg(withRam.map(j => j.ram_mb)),
//           hw,
//         });
//       }).catch(() => {});
//   }, [providerId]);
//   return stats;
// }

// function StatPill({ label, value }: { label: string; value: string }) {
//   return (
//     <div className="bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2 text-center">
//       <div className="text-sm font-semibold text-white/80 tabular-nums">{value}</div>
//       <div className="text-xs text-white/30 mt-0.5">{label}</div>
//     </div>
//   );
// }

// function ProviderStatsRow({ providerId, hw }: { providerId: string; hw: ProviderStats['hw'] }) {
//   const stats = useProviderStats(providerId, hw);
//   if (!stats) return <div className="h-14 rounded-xl bg-white/5 animate-pulse mt-4" />;
//   return (
//     <div className="mt-4 space-y-2">
//       {stats.hw?.cpu_model && (
//         <div className="flex items-center gap-3 text-xs text-white/30 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2">
//           <span className="text-white/50 font-medium">Hardware</span>
//           <span>{stats.hw.cpu_model}</span>
//           {stats.hw.cpu_cores && <span>· {stats.hw.cpu_cores} cores</span>}
//           {stats.hw.ram_total_mb && <span>· {stats.hw.ram_total_mb >= 1024 ? `${(stats.hw.ram_total_mb / 1024).toFixed(0)}GB` : `${stats.hw.ram_total_mb}MB`} RAM</span>}
//         </div>
//       )}
//       {stats.jobs === 0 ? (
//         <div className="text-xs text-white/20 text-center py-1">No jobs yet — stats will appear after first inference</div>
//       ) : (
//         <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
//           <StatPill label="Jobs" value={String(stats.jobs)} />
//           <StatPill label="Avg Latency" value={stats.avgLatency != null ? stats.avgLatency >= 1000 ? `${(stats.avgLatency / 1000).toFixed(1)}s` : `${Math.round(stats.avgLatency)}ms` : '—'} />
//           <StatPill label="Throughput" value={stats.throughput != null ? `${stats.throughput.toFixed(1)} tok/s` : '—'} />
//           <StatPill label="Avg CPU" value={stats.avgCpu != null ? `${stats.avgCpu.toFixed(0)}%` : '—'} />
//           <StatPill label="Avg RAM" value={stats.avgRam != null ? stats.avgRam >= 1024 ? `${(stats.avgRam / 1024).toFixed(1)}GB` : `${Math.round(stats.avgRam)}MB` : '—'} />
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Models tab ────────────────────────────────────────────────────────────────

// function ModelsTab({ providers, loading }: { providers: Provider[]; loading: boolean }) {
//   return (
//     <div className="space-y-4">
//       <h2 className="text-sm font-semibold text-white/70">{providers.length} active provider{providers.length !== 1 ? 's' : ''}</h2>
//       {loading ? (
//         <div className="space-y-3">
//           {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}
//         </div>
//       ) : providers.length === 0 ? (
//         <div className="border border-white/10 rounded-2xl p-12 text-center text-white/30 text-sm">
//           No active providers on-chain.
//         </div>
//       ) : (
//         <div className="grid gap-3">
//           {providers.map(p => (
//             <div key={p.id} className="border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors bg-white/2">
//               <div className="flex items-start justify-between mb-4">
//                 <div>
//                   <div className="flex items-center gap-2 mb-1">
//                     <div className="w-2 h-2 rounded-full bg-green-400" />
//                     <span className="font-semibold">{p.model}</span>
//                   </div>
//                   <div className="font-mono text-xs text-white/30">{p.id.slice(0, 24)}…</div>
//                 </div>
//                 <a
//                   href={`${p.endpoint}/health`}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors border border-white/10 hover:border-white/20 px-2.5 py-1 rounded-lg"
//                 >
//                   Health <ExternalLink className="w-3 h-3" />
//                 </a>
//               </div>
//               <div className="grid grid-cols-3 gap-4 text-sm">
//                 <div>
//                   <div className="text-xs text-white/30 mb-1">Price</div>
//                   <div className="font-semibold">{p.price} <span className="text-white/40 font-normal text-xs">tNIGHT/req</span></div>
//                 </div>
//                 <div>
//                   <div className="text-xs text-white/30 mb-1">Reputation</div>
//                   <div className="flex items-center gap-2">
//                     <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
//                       <div className="h-full bg-violet-500 rounded-full" style={{ width: `${p.reputation * 100}%` }} />
//                     </div>
//                     <span className="text-xs text-white/50 tabular-nums">{(p.reputation * 100).toFixed(0)}%</span>
//                   </div>
//                 </div>
//                 <div>
//                   <div className="text-xs text-white/30 mb-1">Endpoint</div>
//                   <div className="font-mono text-xs text-white/40 truncate">{p.endpoint}</div>
//                 </div>
//               </div>
//               <ProviderStatsRow providerId={p.id} hw={(p as any).hardware ?? null} />
//               <div className="mt-3 bg-black/40 border border-white/5 rounded-xl p-3">
//                 <div className="text-xs text-white/20 mb-2">Quick start</div>
//                 <pre className="text-xs text-white/50 overflow-x-auto"><code>{`ZKai(api_key="…", base_url="https://zkai.vercel.app")`}</code></pre>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── API Keys tab ──────────────────────────────────────────────────────────────

// interface ApiKey { key: string; created_at: string; revoked: boolean; label: string; }

// function KeysTab({ walletAddress, connectedAPI }: { walletAddress: string | null; connectedAPI: ConnectedAPI | null }) {
//   const [keys, setKeys] = useState<ApiKey[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [issuing, setIssuing] = useState(false);
//   const [error, setError] = useState('');
//   const [copiedKey, setCopiedKey] = useState('');

//   const loadKeys = useCallback(async () => {
//     if (!walletAddress) return;
//     setLoading(true);
//     try {
//       const res = await fetch(`/api/auth/me?wallet=${encodeURIComponent(walletAddress)}`);
//       if (res.ok) setKeys((await res.json()).keys ?? []);
//     } finally {
//       setLoading(false);
//     }
//   }, [walletAddress]);

//   useEffect(() => { loadKeys(); }, [loadKeys]);

//   async function issueKey() {
//     if (!walletAddress) return;
//     setIssuing(true);
//     setError('');
//     try {
//       const chalRes = await fetch('/api/auth/challenge', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ wallet_address: walletAddress }),
//       });
//       const { nonce } = await chalRes.json();

//       let coin_public_key: string | null = null;
//       if (connectedAPI) {
//         try {
//           const shielded = await connectedAPI.getShieldedAddresses();
//           coin_public_key = (shielded as any).shieldedCoinPublicKey ?? null;
//         } catch {}
//       }

//       const verRes = await fetch('/api/auth/verify', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ wallet_address: walletAddress, nonce, coin_public_key }),
//       });
//       if (!verRes.ok) {
//         const e = await verRes.json();
//         throw new Error(e.error ?? 'Failed to issue key');
//       }
//       await loadKeys();
//     } catch (e: any) {
//       setError(e.message);
//     } finally {
//       setIssuing(false);
//     }
//   }

//   async function revokeKey(key: string) {
//     if (!walletAddress) return;
//     await fetch('/api/auth/me', {
//       method: 'DELETE',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ key, wallet_address: walletAddress }),
//     });
//     await loadKeys();
//   }

//   function copyKey(key: string) {
//     navigator.clipboard.writeText(key);
//     setCopiedKey(key);
//     setTimeout(() => setCopiedKey(''), 2000);
//   }

//   if (!walletAddress) {
//     return (
//       <div className="border border-white/10 rounded-2xl p-16 text-center space-y-3">
//         <Wallet className="w-8 h-8 text-white/20 mx-auto" />
//         <p className="text-white/40 text-sm">Connect your Midnight wallet to generate API keys.</p>
//       </div>
//     );
//   }

//   const activeKeys = keys.filter(k => !k.revoked);

//   return (
//     <div className="space-y-6">
//       <div className="border border-white/10 rounded-2xl p-6 bg-white/2">
//         <div className="flex items-start justify-between mb-4">
//           <div>
//             <h3 className="font-semibold mb-1">Your API Keys</h3>
//             <p className="text-sm text-white/40">
//               One key works with all ZKai providers. Connect your wallet to generate.
//             </p>
//           </div>
//           <button
//             onClick={issueKey}
//             disabled={issuing}
//             className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-xl transition-colors font-medium shrink-0"
//           >
//             <Key className="w-4 h-4" />
//             {issuing ? 'Generating…' : 'Generate Key'}
//           </button>
//         </div>

//         {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

//         {loading ? (
//           <div className="space-y-2">
//             {[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}
//           </div>
//         ) : activeKeys.length === 0 ? (
//           <div className="border border-dashed border-white/10 rounded-xl p-8 text-center text-white/30 text-sm">
//             No active keys. Generate one above.
//           </div>
//         ) : (
//           <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
//             {activeKeys.map(k => (
//               <div key={k.key} className="flex items-center justify-between px-4 py-3.5 hover:bg-white/2 transition-colors">
//                 <div className="flex items-center gap-3 min-w-0">
//                   <Key className="w-4 h-4 text-violet-400 shrink-0" />
//                   <div className="min-w-0">
//                     <div className="font-mono text-sm text-white/70 truncate">{k.key.slice(0, 28)}…</div>
//                     <div className="text-xs text-white/30 mt-0.5">
//                       Created {new Date(k.created_at).toLocaleDateString()}
//                     </div>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-2 shrink-0 ml-4">
//                   <button
//                     onClick={() => copyKey(k.key)}
//                     className="p-1.5 text-white/30 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"
//                     title="Copy"
//                   >
//                     {copiedKey === k.key ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
//                   </button>
//                   <button
//                     onClick={() => revokeKey(k.key)}
//                     className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
//                     title="Revoke"
//                   >
//                     <XCircle className="w-4 h-4" />
//                   </button>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       <div className="border border-white/10 rounded-2xl p-6 bg-white/2">
//         <h3 className="font-semibold mb-3">Usage</h3>
//         <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
//           <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/5">
//             <span className="text-xs text-white/30">Python SDK</span>
//           </div>
//           <pre className="p-4 text-sm text-white/60 overflow-x-auto"><code>{`from zkai import ZKai

// client = ZKai(
//     api_key="${activeKeys[0]?.key ?? '<your-key>'}",
//     base_url="https://zkai.vercel.app",
// )

// resp = client.chat.completions.create(
//     model="qwen2.5:1.5b",
//     messages=[{"role": "user", "content": "Hello!"}],
// )
// print(resp.choices[0].message.content)`}</code></pre>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ── Main dashboard ─────────────────────────────────────────────────────────────

// export default function DashboardPage() {
//   const [tab, setTab] = useState<Tab>('overview');
//   const [providers, setProviders] = useState<Provider[]>([]);
//   const [jobs, setJobs] = useState<Job[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [walletAddress, setWalletAddress] = useState<string | null>(null);
//   const [connectedAPI, setConnectedAPI] = useState<ConnectedAPI | null>(null);
//   const [lastRefresh, setLastRefresh] = useState(Date.now());

//   const load = useCallback(async () => {
//     setLoading(true);
//     try {
//       const [provRes, jobRes] = await Promise.all([
//         fetch('/api/providers'),
//         walletAddress
//           ? fetch(`/api/jobs?wallet=${encodeURIComponent(walletAddress)}`)
//           : Promise.resolve(null),
//       ]);
//       if (provRes.ok) setProviders(await provRes.json());
//       if (jobRes?.ok) setJobs(await jobRes.json());
//     } finally {
//       setLoading(false);
//     }
//   }, [walletAddress]);

//   useEffect(() => { load(); }, [load, lastRefresh]);

//   return (
//     <div className="min-h-screen bg-black text-white flex flex-col">
//       <Navigation />

//       {/* Top bar */}
//       <div className="border-b border-white/10 px-6 pt-24 pb-4 flex items-center justify-between">
//         <h1 className="text-lg font-semibold">Dashboard</h1>
//         <div className="flex items-center gap-3">
//           <button
//             onClick={() => setLastRefresh(Date.now())}
//             className="p-2 text-white/30 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"
//             title="Refresh"
//           >
//             <RefreshCw className="w-4 h-4" />
//           </button>
//           <WalletButton
//             onWalletChange={setWalletAddress}
//             onApiChange={setConnectedAPI}
//           />
//         </div>
//       </div>

//       {/* Body */}
//       <div className="flex flex-1 overflow-hidden">
//         <Sidebar tab={tab} setTab={setTab} />
//         <main className="flex-1 overflow-y-auto p-8">
//           {tab === 'overview' && (
//             <OverviewTab
//               jobs={jobs}
//               providers={providers}
//               loading={loading}
//               walletAddress={walletAddress}
//               connectedAPI={connectedAPI}
//             />
//           )}
//           {tab === 'activity' && <ActivityTab jobs={jobs} loading={loading} />}
//           {tab === 'models' && <ModelsTab providers={providers} loading={loading} />}
//           {tab === 'keys' && <KeysTab walletAddress={walletAddress} connectedAPI={connectedAPI} />}
//         </main>
//       </div>
//     </div>
//   );
// }

// ── NEW DASHBOARD (OpenRouter-style layout, ZKai theme) ────────────────────────
'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ElementType, FC } from 'react';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Activity,
  BarChart2,
  Check,
  CheckCircle,
  Info,
  ChevronRight,
  Copy,
  Cpu,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Key,
  Layers,
  Lock,
  Plus,
  Search,
  Settings,
  Shield,
  Trash2,
  Wallet,
  X,
  XCircle,
  Clock,
} from 'lucide-react';
import { Navigation } from '@/components/navigation';
import { cn } from '@/lib/utils';
import type { ConnectedAPI } from '@/lib/wallet';
import { callEscrow } from '@/lib/escrow';

// ── Types ─────────────────────────────────────────────────────────────────────

type DashSection =
  | 'api-keys'
  | 'guardrails'
  | 'byok'
  | 'routing'
  | 'presets'
  | 'plugins'
  | 'observability'
  | 'settings'
  | 'activity'
  | 'logs'
  | 'credits'
  | 'management-keys'
  | 'preferences';

interface SidebarItem {
  id: DashSection;
  label: string;
  icon: ElementType;
  group: 'platform' | 'account';
  locked?: boolean;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'api-keys',        label: 'API Keys',        icon: Key,        group: 'platform' },
  { id: 'guardrails',      label: 'Guardrails',      icon: Shield,     group: 'platform', locked: true },
  { id: 'byok',            label: 'BYOK',            icon: Cpu,        group: 'platform', locked: true },
  { id: 'routing',         label: 'Routing',         icon: Layers,     group: 'platform', locked: true },
  { id: 'presets',         label: 'Presets',         icon: BarChart2,  group: 'platform', locked: true },
  { id: 'plugins',         label: 'Plugins',         icon: Layers,     group: 'platform', locked: true },
  { id: 'observability',   label: 'Observability',   icon: Eye,        group: 'platform', locked: true },
  { id: 'settings',        label: 'Settings',        icon: Settings,   group: 'platform', locked: true },
  { id: 'activity',        label: 'Activity',        icon: Activity,   group: 'account' },
  { id: 'logs',            label: 'Logs',            icon: FileText,   group: 'account' },
  { id: 'credits',         label: 'Credits',         icon: CreditCard, group: 'account' },
  { id: 'management-keys', label: 'Management Keys', icon: Lock,       group: 'account', locked: true },
  { id: 'preferences',     label: 'Preferences',     icon: Settings,   group: 'account', locked: true },
];

function isDashSection(value: string | null): value is DashSection {
  return !!value && SIDEBAR_ITEMS.some(item => item.id === value);
}

// ── Data helpers (same sources as legacy dashboard: /api/auth/me, /api/jobs, /api/escrow/balance) ──

interface ApiKeyRow {
  key: string;
  created_at: string;
  revoked: boolean;
  label: string;
}

interface DashboardJob {
  id: string;
  provider_id: string;
  amount: number;
  model: string;
  status: 0 | 1 | 2;
  attestation_hash: string;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  duration_ms?: number | null;
  cpu_percent?: number | null;
  ram_mb?: number | null;
  created_at?: string | null;
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLatencyMs(ms: number | null | undefined): string {
  if (ms == null || ms < 0) return '—';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function jobTokens(j: DashboardJob): number {
  return (j.prompt_tokens ?? 0) + (j.completion_tokens ?? 0);
}

function monthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function isInCurrentMonth(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const { start, end } = monthBounds();
  return d >= start && d <= end;
}

// ── Shared badges ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: number }) {
  const cfg: Record<number, { label: string; cls: string }> = {
    0: { label: 'Pending',   cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
    1: { label: 'Completed', cls: 'text-green-400  bg-green-500/10  border-green-500/20'  },
    2: { label: 'Refunded',  cls: 'text-red-400    bg-red-500/10    border-red-500/20'    },
  };
  const { label, cls } = cfg[status] ?? { label: 'Unknown', cls: 'text-white/40 bg-white/5 border-white/10' };
  return <span className={`text-xs border px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

function HttpBadge({ code }: { code: number }) {
  const ok = code >= 200 && code < 300;
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${ok ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
      {code}
    </span>
  );
}

// ── Quick-start snippet ────────────────────────────────────────────────────────

const SNIPPET_ZKAI = (key: string) => `pip install zkai

# ---

from zkai import ZKai

client = ZKai(api_key="${key}")

response = client.chat.completions.create(
    model="qwen2.5:1.5b",
    messages=[{"role": "user", "content": "Hello!"}],
)
print(response.choices[0].message.content)
# response includes attestation_hash — verifiable on-chain`;

const SNIPPET_PYTHON = (key: string) => `from openai import OpenAI

client = OpenAI(
    api_key="${key}",
    base_url="https://zkai.vercel.app/api/v1",
)

response = client.chat.completions.create(
    model="qwen2.5:1.5b",
    messages=[{"role": "user", "content": "Hello!"}],
)
print(response.choices[0].message.content)
print(response.usage)`;

const SNIPPET_CURL = (key: string) => `curl https://zkai.vercel.app/api/v1/chat/completions \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "qwen2.5:1.5b",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;

const SNIPPET_JS = (key: string) => `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "${key}",
  baseURL: "https://zkai.vercel.app/api/v1",
});

const res = await client.chat.completions.create({
  model: "qwen2.5:1.5b",
  messages: [{ role: "user", content: "Hello!" }],
});
console.log(res.choices[0].message.content);`;

function QuickStart({ apiKey }: { apiKey: string }) {
  const [tab, setTab] = useState<'zkai' | 'python' | 'curl' | 'js'>('zkai');
  const [copied, setCopied] = useState(false);

  const snippets = { zkai: SNIPPET_ZKAI(apiKey), python: SNIPPET_PYTHON(apiKey), curl: SNIPPET_CURL(apiKey), js: SNIPPET_JS(apiKey) };
  const current = snippets[tab];

  function copy() {
    void navigator.clipboard.writeText(current);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const tabs: { id: 'zkai' | 'python' | 'curl' | 'js'; label: string }[] = [
    { id: 'zkai',   label: 'ZKai SDK' },
    { id: 'python', label: 'Python'   },
    { id: 'curl',   label: 'cURL'     },
    { id: 'js',     label: 'Node.js'  },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <p className="text-sm font-medium text-white/70">Quick start</p>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/30 p-0.5">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                tab === t.id
                  ? 'bg-cyan-500 text-[#001018]'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        <pre className="overflow-x-auto px-5 py-4 text-xs leading-relaxed text-white/70">
          <code>{current}</code>
        </pre>
        <button
          type="button"
          onClick={copy}
          className="absolute right-3 top-3 rounded-md border border-white/10 bg-white/[0.04] p-1.5 text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/70"
          title="Copy"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ── Section: API Keys ──────────────────────────────────────────────────────────

function ApiKeysSection({
  walletAddress,
  connectedAPI,
}: {
  walletAddress: string | null;
  connectedAPI: ConnectedAPI | null;
}) {
  const [rows, setRows] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState('');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState('');
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createError, setCreateError] = useState('');

  const loadKeys = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/me?wallet=${encodeURIComponent(walletAddress)}`);
      if (res.ok) {
        const data = await res.json();
        setRows((data.keys ?? []) as ApiKeyRow[]);
      }
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  function copyKey(key: string) {
    navigator.clipboard.writeText(key).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }

  function toggleReveal(id: string) {
    setRevealed(prev => ({ ...prev, [id]: !prev[id] }));
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

  async function issueKey(label: string): Promise<boolean> {
    if (!walletAddress) return false;
    setIssuing(true);
    setIssueError('');
    try {
      const chalRes = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletAddress }),
      });
      if (!chalRes.ok) {
        const e = await chalRes.json().catch(() => ({}));
        throw new Error((e as { error?: string }).error ?? 'Failed to request challenge');
      }
      const { nonce } = await chalRes.json();

      let coin_public_key: string | null = null;
      if (connectedAPI) {
        try {
          const shielded = await connectedAPI.getShieldedAddresses();
          coin_public_key = (shielded as { shieldedCoinPublicKey?: string }).shieldedCoinPublicKey ?? null;
        } catch {
          /* ignore */
        }
      }

      const verRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletAddress, nonce, coin_public_key, label }),
      });
      if (!verRes.ok) {
        const e = await verRes.json();
        throw new Error(e.error ?? 'Failed to issue key');
      }
      await loadKeys();
      return true;
    } catch (e: unknown) {
      setIssueError(e instanceof Error ? e.message : 'Failed to issue key');
      return false;
    } finally {
      setIssuing(false);
    }
  }

  function openCreateModal() {
    setCreateError('');
    setIssueError('');
    setNewKeyName('');
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    if (issuing) return;
    setShowCreateModal(false);
  }

  async function submitCreateKey() {
    const label = newKeyName.trim();
    if (!label) {
      setCreateError('Name is required.');
      return;
    }
    setCreateError('');
    const ok = await issueKey(label);
    if (ok) {
      setShowCreateModal(false);
      setNewKeyName('');
    }
  }

  const activeKeys = rows.filter(k => !k.revoked);
  const filtered = activeKeys.filter(k =>
    (k.label || 'key').toLowerCase().includes(search.toLowerCase()),
  );
  const createDisabled = !walletAddress || issuing;

  if (!walletAddress) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-white">API Keys</h1>
          <p className="mt-1 text-sm text-white/40">Create and manage your API keys.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-8 py-16 text-center">
          <Wallet className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-3 text-sm text-white/40">Connect your Midnight wallet in the header to view and create API keys.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">API Keys</h1>
        <p className="mt-1 text-sm text-white/40">Create and manage your API keys.</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <p className="text-sm text-white/50">Manage your keys to access all models</p>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-8 pr-3 text-sm text-white placeholder:text-white/25 focus:border-violet-500/40 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              disabled={createDisabled}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-[#001018] shadow-[0_8px_24px_rgba(6,182,212,0.3)] transition hover:bg-cyan-400"
            >
              <Plus className="h-4 w-4" />
              {issuing ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
        {issueError && <p className="border-b border-white/10 px-4 py-2 text-xs text-red-400">{issueError}</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.01]">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/35">Key</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/35">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/35">Expires</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/35">Last Used</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/35">Usage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/35">Limit</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-white/30">Loading keys…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-white/30">No keys found.</td>
                </tr>
              ) : filtered.map(k => (
                <tr key={k.key} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3.5">
                    <div className="space-y-0.5">
                      <p className="font-medium text-white/80">{k.label || '—'}</p>
                      <p className="font-mono text-xs text-white/35">
                        {revealed[k.key] ? k.key : `${k.key.slice(0, 16)}...${k.key.slice(-4)}`}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-white/55">
                    {formatDateTime(k.created_at)}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-white/45">—</td>
                  <td className="px-4 py-3.5 text-xs text-white/45">—</td>
                  <td className="px-4 py-3.5 text-xs font-medium text-white/70">—</td>
                  <td className="px-4 py-3.5 text-xs text-white/60">
                    <span>—</span>{' '}
                    <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-white/40">
                      MONTH
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => toggleReveal(k.key)}
                        className="rounded-md p-1.5 text-white/30 transition-colors hover:bg-white/5 hover:text-white/70"
                        title={revealed[k.key] ? 'Hide key' : 'Reveal key'}
                      >
                        {revealed[k.key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyKey(k.key)}
                        className="rounded-md p-1.5 text-white/30 transition-colors hover:bg-white/5 hover:text-white/70"
                        title="Copy key"
                      >
                        {copied === k.key ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => revokeKey(k.key)}
                        className="rounded-md p-1.5 text-white/30 transition-colors hover:bg-red-950/30 hover:text-red-400"
                        title="Revoke key"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick-start snippet */}
      <QuickStart apiKey={rows.find(r => !r.revoked)?.key ?? '<your-api-key>'} />

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-[1px]"
          onClick={closeCreateModal}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0c10] p-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Create API Key</h2>
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={issuing}
                className="rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-40"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={e => {
                e.preventDefault();
                void submitCreateKey();
              }}
            >
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm text-white/70">
                  Name
                  <Info className="h-3.5 w-3.5 text-white/35" />
                </label>
                <input
                  autoFocus
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  placeholder='e.g. "Chatbot Key"'
                  maxLength={80}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-violet-500/40 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm text-white/70">
                  Credit limit (optional)
                  <Info className="h-3.5 w-3.5 text-white/35" />
                </label>
                <input
                  disabled
                  defaultValue=""
                  placeholder="Leave blank for unlimited"
                  className="w-full cursor-not-allowed rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/35 placeholder:text-white/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm text-white/70">
                  Expiration
                  <Info className="h-3.5 w-3.5 text-white/35" />
                </label>
                <select
                  disabled
                  defaultValue="none"
                  className="w-full cursor-not-allowed rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/35"
                >
                  <option value="none">No expiration</option>
                </select>
              </div>

              {createError && <p className="text-xs text-red-400">{createError}</p>}
              {issueError && <p className="text-xs text-red-400">{issueError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={issuing}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/65 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issuing || !newKeyName.trim()}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {issuing ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Job Row (expandable) ────────────────────────────────────────────────────────

function JobRow({ job, StatusIcon }: {
  job: DashboardJob & { uiStatus: 0 | 1 | 2 };
  StatusIcon: FC<{ status: number }>;
}) {
  const [open, setOpen] = useState(false);
  const hasAttestation = job.attestation_hash && !/^0+$/.test(job.attestation_hash.trim());

  const details: { label: string; value: string | number | null | undefined }[] = [
    { label: 'Job ID',            value: job.id },
    { label: 'Provider ID',       value: job.provider_id || '—' },
    { label: 'Model',             value: job.model || '—' },
    { label: 'Prompt tokens',     value: job.prompt_tokens ?? '—' },
    { label: 'Completion tokens', value: job.completion_tokens ?? '—' },
    { label: 'Duration',          value: job.duration_ms != null ? `${job.duration_ms} ms` : '—' },
    { label: 'CPU',               value: job.cpu_percent != null ? `${job.cpu_percent.toFixed(1)}%` : '—' },
    { label: 'RAM',               value: job.ram_mb != null ? `${job.ram_mb.toFixed(0)} MB` : '—' },
    { label: 'Attestation hash',  value: hasAttestation ? job.attestation_hash : '—' },
  ];

  return (
    <div className="divide-y divide-white/[0.04]">
      <div
        className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <StatusIcon status={job.uiStatus} />
          <div>
            <div className="text-sm font-medium text-white/80">{job.model || '—'}</div>
            <div className="text-xs text-white/30 mt-0.5">{formatRelativeTime(job.created_at)}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/40 tabular-nums">{jobTokens(job).toLocaleString()} tokens</span>
          <span className="text-xs text-white/50 tabular-nums">{job.amount.toLocaleString()} tNIGHT</span>
          <StatusBadge status={job.uiStatus} />
          <ChevronRight
            className={`h-3.5 w-3.5 text-white/25 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          />
        </div>
      </div>

      {open && (
        <div className="bg-white/[0.01] px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2.5">
          {details.map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4 text-xs">
              <span className="text-white/35 shrink-0">{label}</span>
              <span className={`font-mono text-right break-all ${label === 'Attestation hash' && hasAttestation ? 'text-cyan-400' : 'text-white/60'}`}>
                {value as string}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section: Activity ──────────────────────────────────────────────────────────

function deriveJobUiStatus(j: DashboardJob): 0 | 1 | 2 {
  const h = j.attestation_hash ?? '';
  const noAttest = !h || /^0+$/.test(h.trim());
  if (noAttest && jobTokens(j) === 0 && (j.duration_ms == null || j.duration_ms === 0)) return 0;
  return 1;
}

function ActivitySection({ walletAddress }: { walletAddress: string | null }) {
  const [filter, setFilter] = useState<-1 | 0 | 1 | 2>(-1);
  const [jobs, setJobs] = useState<DashboardJob[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) return;
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const r = await fetch(`/api/jobs?wallet=${encodeURIComponent(walletAddress)}`);
        const data = r.ok ? await r.json() : [];
        if (!cancelled) setJobs(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setJobs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  const enriched = useMemo(() => {
    const source = walletAddress ? jobs : [];
    return source.map(j => ({ ...j, uiStatus: deriveJobUiStatus(j) }));
  }, [walletAddress, jobs]);

  const filtered =
    filter === -1 ? enriched : enriched.filter(j => j.uiStatus === filter);

  function StatusIcon({ status }: { status: number }) {
    if (status === 1) return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === 2) return <XCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-yellow-400" />;
  }

  const totalTokens = enriched.reduce((s, j) => s + jobTokens(j), 0);
  const completedCount = enriched.filter(j => j.uiStatus === 1).length;

  if (!walletAddress) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-white">Activity</h1>
          <p className="mt-1 text-sm text-white/40">Your recent inference requests and outcomes.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-8 py-16 text-center text-sm text-white/30">
          Connect your wallet in the header to see inference activity for your account.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Activity</h1>
        <p className="mt-1 text-sm text-white/40">Your recent inference requests and outcomes.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {([
          { label: 'Total Requests', value: loading ? '—' : enriched.length, icon: Layers },
          { label: 'Completed', value: loading ? '—' : completedCount, icon: CheckCircle },
          { label: 'Total Tokens', value: loading ? '—' : totalTokens.toLocaleString(), icon: BarChart2 },
        ] as const).map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4 text-violet-300" />
              <span className="text-xs text-white/40">{label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="w-fit rounded-lg border border-white/10 bg-white/[0.02] p-1">
        {([[-1, 'All'], [1, 'Completed'], [0, 'Pending'], [2, 'Refunded']] as const).map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => setFilter(val)}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${filter === val ? 'bg-white/10 text-white font-medium' : 'text-white/40 hover:text-white/70'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="border border-white/10 rounded-xl overflow-hidden divide-y divide-white/[0.06]">
        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-white/30">Loading activity…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-white/30">No jobs match this filter.</div>
        ) : (
          filtered.map(job => <JobRow key={job.id} job={job} StatusIcon={StatusIcon} />)
        )}
      </div>
    </div>
  );
}

// ── Section: Logs ──────────────────────────────────────────────────────────────

/** Gateway request logs derived from stored jobs (same /api/jobs feed as Activity). */
function LogsSection({ walletAddress }: { walletAddress: string | null }) {
  const [jobs, setJobs] = useState<DashboardJob[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) return;
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const r = await fetch(`/api/jobs?wallet=${encodeURIComponent(walletAddress)}`);
        const data = r.ok ? await r.json() : [];
        if (!cancelled) setJobs(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setJobs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  const logJobs = useMemo(() => (walletAddress ? jobs : []), [walletAddress, jobs]);

  if (!walletAddress) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-white">Logs</h1>
          <p className="mt-1 text-sm text-white/40">Raw HTTP request logs for your API calls.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-8 py-16 text-center text-sm text-white/30">
          Connect your wallet in the header to see request logs from your API usage.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Logs</h1>
        <p className="mt-1 text-sm text-white/40">Raw HTTP request logs for your API calls.</p>
      </div>

      <div className="border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Method</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Path</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Latency</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-white/30">Loading logs…</td>
              </tr>
            ) : logJobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-white/30">No request logs yet.</td>
              </tr>
            ) : (
              logJobs.map(job => {
                const code =
                  job.duration_ms != null || (job.completion_tokens ?? 0) > 0 ? 200 : 502;
                return (
                  <tr key={job.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded">
                        POST
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-white/60">/v1/chat/completions</td>
                    <td className="px-4 py-3.5"><HttpBadge code={code} /></td>
                    <td className="px-4 py-3.5 text-xs text-white/40 tabular-nums">{formatLatencyMs(job.duration_ms)}</td>
                    <td className="px-4 py-3.5 text-xs text-white/30">{formatRelativeTime(job.created_at)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section: Credits ───────────────────────────────────────────────────────────

function CreditsSection({
  walletAddress,
  connectedAPI,
}: {
  walletAddress: string | null;
  connectedAPI: ConnectedAPI | null;
}) {
  const [escrowBalance, setEscrowBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [depositStatus, setDepositStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [depositMsg, setDepositMsg] = useState('');
  const [depositAmount, setDepositAmount] = useState('100');
  const [jobs, setJobs] = useState<DashboardJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  const fetchBalance = useCallback(async (api: ConnectedAPI) => {
    setBalanceLoading(true);
    try {
      const shielded = await api.getShieldedAddresses();
      const cpk = (shielded as { shieldedCoinPublicKey?: string }).shieldedCoinPublicKey;
      if (!cpk) {
        setEscrowBalance(null);
        return;
      }
      const res = await fetch(`/api/escrow/balance?coinPublicKey=${encodeURIComponent(cpk)}`);
      if (res.ok) {
        const { balance } = await res.json();
        setEscrowBalance(typeof balance === 'string' ? balance : String(balance));
      }
    } catch {
      setEscrowBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (connectedAPI) fetchBalance(connectedAPI);
    else setEscrowBalance(null);
  }, [connectedAPI, fetchBalance]);

  useEffect(() => {
    if (!walletAddress) return;
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setJobsLoading(true);
      try {
        const r = await fetch(`/api/jobs?wallet=${encodeURIComponent(walletAddress)}`);
        const data = r.ok ? await r.json() : [];
        if (!cancelled) setJobs(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setJobs([]);
      } finally {
        if (!cancelled) setJobsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  const monthJobs = useMemo(() => {
    const creditJobs = walletAddress ? jobs : [];
    return creditJobs.filter(j => isInCurrentMonth(j.created_at));
  }, [walletAddress, jobs]);
  const totalSpent = monthJobs.reduce((s, j) => s + j.amount, 0);
  const requestCount = monthJobs.length;
  const avgPerCall = requestCount > 0 ? totalSpent / requestCount : 0;

  async function handleDeposit() {
    if (!connectedAPI) {
      setDepositStatus('err');
      setDepositMsg('Connect Lace and approve wallet access to deposit.');
      return;
    }
    const n = Number(depositAmount);
    if (!depositAmount.trim() || Number.isNaN(n) || n <= 0 || !Number.isFinite(n)) {
      setDepositStatus('err');
      setDepositMsg('Enter a valid tNIGHT amount (positive number).');
      return;
    }
    setDepositStatus('loading');
    setDepositMsg('Approve in Lace wallet…');
    try {
      await callEscrow(connectedAPI, 'deposit', BigInt(Math.floor(n)));
      setDepositStatus('ok');
      setDepositMsg('Deposited. Refreshing balance…');
      setTimeout(() => fetchBalance(connectedAPI), 5000);
    } catch (e: unknown) {
      setDepositStatus('err');
      setDepositMsg(e instanceof Error ? e.message : 'Deposit failed');
    }
  }

  const displayBalance =
    escrowBalance !== null ? (balanceLoading ? '…' : escrowBalance) : walletAddress ? '—' : '0';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Credits</h1>
        <p className="mt-1 text-sm text-white/40">Manage your tNIGHT escrow balance and spending.</p>
      </div>

      <div className="border border-violet-500/20 rounded-xl p-6 bg-violet-500/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-violet-400" />
            <span className="font-semibold text-white">Escrow Balance</span>
          </div>
          <span className="text-xs text-white/30">tNIGHT locked for inference</span>
        </div>
        <div className="text-4xl font-bold text-white mb-1">
          {displayBalance}{' '}
          <span className="text-lg font-normal text-white/40">tNIGHT</span>
        </div>
        <p className="text-xs text-white/30 mt-2">
          {walletAddress
            ? 'Deposit tNIGHT into the escrow contract to pay for inference. Balance is read from chain when Lace is connected.'
            : 'Connect your Midnight wallet to deposit tNIGHT and enable inference payments.'}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="Amount (tNIGHT)"
            value={depositAmount}
            onChange={e => setDepositAmount(e.target.value)}
            disabled={!connectedAPI || depositStatus === 'loading'}
            className="w-full min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-violet-500/50 focus:outline-none disabled:opacity-50 sm:max-w-xs"
          />
          <button
            type="button"
            onClick={() => handleDeposit()}
            disabled={depositStatus === 'loading' || !connectedAPI}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {depositStatus === 'loading' ? 'Depositing…' : 'Deposit tNIGHT'}
          </button>
        </div>
        {depositMsg && (
          <p className={`mt-2 text-xs ${depositStatus === 'ok' ? 'text-green-400' : depositStatus === 'err' ? 'text-red-400' : 'text-white/40'}`}>
            {depositMsg}
          </p>
        )}
      </div>

      <div className="border border-white/10 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white/70 mb-4">Spending This Month</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Total Spent',
              value: !walletAddress || jobsLoading ? '—' : `${totalSpent.toLocaleString()} tNIGHT`,
            },
            {
              label: 'Requests',
              value: !walletAddress || jobsLoading ? '—' : String(requestCount),
            },
            {
              label: 'Avg per Call',
              value:
                !walletAddress || jobsLoading
                  ? '—'
                  : requestCount === 0
                    ? '0 tNIGHT'
                    : `${(avgPerCall).toLocaleString(undefined, { maximumFractionDigits: 6 })} tNIGHT`,
            },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/[0.03] border border-white/5 rounded-lg px-4 py-3">
              <div className="text-xs text-white/30 mb-1">{label}</div>
              <div className="text-sm font-semibold text-white/80">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-white/10 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white/70">How Escrow Works</h3>
        {[
          { step: '1', text: 'Deposit tNIGHT once into the ZKai escrow contract.' },
          { step: '2', text: 'Each inference request auto-deducts 100 tNIGHT from your balance.' },
          { step: '3', text: 'Unused funds can be withdrawn at any time.' },
        ].map(({ step, text }) => (
          <div key={step} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs text-violet-400 font-bold">{step}</span>
            </div>
            <p className="text-sm text-white/40">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Locked placeholder ─────────────────────────────────────────────────────────

function LockedSection({ label }: { label: string }) {
  return (
    <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="pointer-events-none absolute inset-0 backdrop-blur-sm" />
      <div className="relative text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <Lock className="h-5 w-5 text-white/25" />
        </div>
        <h2 className="text-lg font-semibold text-white/40">{label}</h2>
        <p className="mt-1 text-sm text-white/25">Coming soon</p>
      </div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

function DashSidebar({ active, setActive }: { active: DashSection; setActive: (s: DashSection) => void }) {
  const mainItems = SIDEBAR_ITEMS.filter(i => i.group === 'platform');
  const acctItems = SIDEBAR_ITEMS.filter(i => i.group === 'account');

  function Item({ item }: { item: SidebarItem }) {
    const isActive = active === item.id;
    const isLocked = !!item.locked;
    const Icon = item.icon;

    return (
      <button
        onClick={() => !isLocked && setActive(item.id)}
        disabled={isLocked}
        className={cn(
          'group relative w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors',
          isActive ? 'border-white/20 bg-white/[0.08] text-white' : 'border-transparent text-white/55 hover:bg-white/[0.04] hover:text-white/85',
          isLocked && 'cursor-not-allowed text-white/30',
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className={cn('h-4 w-4 shrink-0', isLocked && 'blur-[1px] opacity-70')} />
          <span className={cn('flex-1', isLocked && 'blur-[2px] opacity-80 select-none')}>{item.label}</span>
          {isLocked && <Lock className="h-3 w-3 shrink-0 text-white/20" />}
          {isActive && !isLocked && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/35" />}
        </div>
      </button>
    );
  }

  return (
    <aside className="w-60 shrink-0 border-r border-white/10 bg-transparent">
      <nav className="h-full overflow-y-auto p-3">
        <div className="space-y-0.5">
          {mainItems.map(item => <Item key={item.id} item={item} />)}
        </div>
        <div className="mt-5 space-y-0.5">
          <div className="px-3 pb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">Account</span>
          </div>
          {acctItems.map(item => <Item key={item.id} item={item} />)}
        </div>
      </nav>
    </aside>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

function DashboardPageContent() {
  const searchParams = useSearchParams();
  const [section, setSection] = useState<DashSection>(() => {
    const requestedSection = searchParams.get('section');
    return isDashSection(requestedSection) ? requestedSection : 'api-keys';
  });
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connectedAPI, setConnectedAPI] = useState<ConnectedAPI | null>(null);

  const sectionLabel = useMemo(
    () => SIDEBAR_ITEMS.find(i => i.id === section)?.label ?? section,
    [section],
  );

  const fontVars = {
    '--font-sans': "'Geist', 'Geist Fallback'",
    '--font-mono': "'Geist Mono', 'Geist Mono Fallback'",
  } as CSSProperties;

  function renderSection() {
    switch (section) {
      case 'api-keys':
        return <ApiKeysSection walletAddress={walletAddress} connectedAPI={connectedAPI} />;
      case 'activity':
        return <ActivitySection walletAddress={walletAddress} />;
      case 'logs':
        return <LogsSection walletAddress={walletAddress} />;
      case 'credits':
        return <CreditsSection walletAddress={walletAddress} connectedAPI={connectedAPI} />;
      default:
        return <LockedSection label={sectionLabel} />;
    }
  }

  return (
    <main className="dark relative min-h-screen overflow-hidden bg-black font-sans text-white" style={fontVars}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(165,243,208,0.12)_0%,transparent_30%),radial-gradient(circle_at_88%_12%,rgba(255,158,141,0.1)_0%,transparent_32%),radial-gradient(circle_at_54%_100%,rgba(179,157,219,0.1)_0%,transparent_42%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <Navigation
        forceTransparent
        onWalletChange={setWalletAddress}
        onApiChange={setConnectedAPI}
      />

      <div className="relative z-10 min-h-screen pt-20">
        <div className="flex min-h-[calc(100vh-5rem)]">
          <DashSidebar active={section} setActive={setSection} />
          <section className="min-w-0 flex-1 px-4 pb-8 pt-4 sm:px-6 lg:px-10">
            {renderSection()}
          </section>
        </div>
      </div>
    </main>
  );
}

function DashboardPageFallback() {
  const fontVars = {
    '--font-sans': "'Geist', 'Geist Fallback'",
    '--font-mono': "'Geist Mono', 'Geist Mono Fallback'",
  } as CSSProperties;

  return (
    <main className="dark relative min-h-screen overflow-hidden bg-black font-sans text-white" style={fontVars}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(165,243,208,0.12)_0%,transparent_30%),radial-gradient(circle_at_88%_12%,rgba(255,158,141,0.1)_0%,transparent_32%),radial-gradient(circle_at_54%_100%,rgba(179,157,219,0.1)_0%,transparent_42%)]" />
      <div className="relative z-10 flex min-h-screen items-center justify-center pt-20">
        <p className="text-sm text-white/40">Loading…</p>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardPageFallback />}>
      <DashboardPageContent />
    </Suspense>
  );
}
