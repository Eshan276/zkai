import Link from 'next/link';
import { Shield, Zap, Lock, Globe, ChevronRight, Terminal } from 'lucide-react';
import { fetchProviders } from '@/lib/indexer';
import { CONTRACTS } from '@/lib/contracts';

export default async function LandingPage() {
  let providers: Awaited<ReturnType<typeof fetchProviders>> = [];
  try {
    if (CONTRACTS.ProviderRegistry) {
      providers = await fetchProviders(CONTRACTS.ProviderRegistry);
    }
  } catch {}

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-violet-400" />
          <span className="font-bold text-lg tracking-tight">ZKai</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-white/60">
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#providers" className="hover:text-white transition-colors">Providers</a>
          <a href="https://github.com/Eshan276/zkai" className="hover:text-white transition-colors">GitHub</a>
          <Link
            href="/dashboard"
            className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-1.5 rounded-lg transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-violet-950/60 border border-violet-500/30 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-8">
          <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          Built on Midnight · Zero-knowledge privacy
        </div>
        <h1 className="text-6xl font-bold tracking-tight mb-6 leading-tight">
          Private AI inference,<br />
          <span className="text-violet-400">verified on-chain</span>
        </h1>
        <p className="text-xl text-white/50 max-w-2xl mx-auto mb-10">
          Send encrypted prompts to AI providers running inside TEEs.
          No one — not even the operator — can read your data.
          Every inference is attested and anchored to Midnight blockchain.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Open Dashboard <ChevronRight className="w-4 h-4" />
          </Link>
          <a
            href="https://github.com/Eshan276/zkai"
            className="flex items-center gap-2 border border-white/20 hover:border-white/40 text-white/70 hover:text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            View on GitHub
          </a>
        </div>
      </section>

      {/* Code snippet */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
            <Terminal className="w-4 h-4 text-white/40" />
            <span className="text-sm text-white/40">Python · Drop-in OpenAI replacement</span>
          </div>
          <pre className="p-6 text-sm text-white/80 overflow-x-auto leading-relaxed"><code>{`from zkai import ZKai

client = ZKai(
    api_key="your-key",
    base_url="https://zkai.vercel.app",
)

resp = client.chat.completions.create(
    model="qwen2.5:1.5b",
    messages=[{"role": "user", "content": "Hello!"}],
)
print(resp.choices[0].message.content)
# Prompt was encrypted end-to-end. Provider never saw plaintext.`}</code></pre>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-20 border-t border-white/10">
        <h2 className="text-3xl font-bold text-center mb-4">How it works</h2>
        <p className="text-white/50 text-center mb-16">Four steps. Your prompt never leaves your machine in plaintext.</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {([
            { icon: Lock, step: '01', title: 'Encrypt', desc: 'Client generates ephemeral X25519 keypair and encrypts the prompt with the provider\'s TEE public key.' },
            { icon: Zap, step: '02', title: 'Infer', desc: 'Provider decrypts inside Gramine SGX, runs the LLM, encrypts the response back. Operator sees only ciphertext.' },
            { icon: Shield, step: '03', title: 'Attest', desc: 'Enclave signs a report — model hash, manifest hash, pubkey. The hash is anchored on Midnight blockchain.' },
            { icon: Globe, step: '04', title: 'Verify', desc: 'SDK verifies attestation hash matches on-chain. Tampered responses raise ZKaiAttestationError automatically.' },
          ] as const).map(({ icon: Icon, step, title, desc }) => (
            <div key={step}>
              <div className="text-5xl font-black text-white/5 mb-4">{step}</div>
              <div className="w-10 h-10 rounded-xl bg-violet-950 border border-violet-500/30 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Providers */}
      <section id="providers" className="max-w-5xl mx-auto px-6 py-20 border-t border-white/10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold mb-2">Active Providers</h2>
            <p className="text-white/50">Registered on Midnight preprod · Updated every 30s</p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
          >
            View all in dashboard <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {providers.length === 0 ? (
          <div className="border border-white/10 rounded-2xl p-12 text-center text-white/30">
            {CONTRACTS.ProviderRegistry
              ? 'No active providers found on-chain.'
              : 'Configure NEXT_PUBLIC_REGISTRY_CONTRACT to show live providers.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map(p => (
              <div key={p.id} className="border border-white/10 rounded-2xl p-6 hover:border-violet-500/30 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-mono text-sm text-white/40 mb-1">{p.id.slice(0, 16)}…</div>
                    <div className="font-semibold">{p.model}</div>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs bg-green-950/60 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    Active
                  </span>
                </div>
                <div className="flex items-center gap-6 text-sm text-white/50">
                  <span>{p.price} DUST/req</span>
                  <span>{(p.reputation * 100).toFixed(0)}% reputation</span>
                </div>
                <div className="mt-3 font-mono text-xs text-white/30 truncate">{p.endpoint}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-white/30">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-violet-400" />
          <span className="font-semibold text-white/60">ZKai</span>
        </div>
        Private AI inference on Midnight blockchain ·{' '}
        <a href="https://github.com/Eshan276/zkai" className="hover:text-white/60 transition-colors">
          Open source
        </a>
      </footer>
    </div>
  );
}
