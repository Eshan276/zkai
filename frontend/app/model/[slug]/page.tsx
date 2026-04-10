"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { ModelDetailView } from "@/components/models/model-detail-view";
import type { ModelDetailViewModel } from "@/lib/types/model-detail";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ModelDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
      {/* Hero skeleton */}
      <div className="mb-8 space-y-4">
        <div className="h-4 w-28 animate-pulse rounded-md bg-white/8" />
        <div className="h-9 w-2/3 animate-pulse rounded-lg bg-white/8" />
        <div className="h-5 w-1/2 animate-pulse rounded-md bg-white/6" />
        <div className="mt-2 flex gap-3">
          {[80, 64, 72, 56].map((w, i) => (
            <div key={i} className={`h-7 w-${w === 80 ? '20' : w === 64 ? '16' : w === 72 ? '18' : '14'} animate-pulse rounded-full bg-white/8`} />
          ))}
        </div>
        <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded-md bg-white/6" />
        <div className="h-4 w-5/6 max-w-xl animate-pulse rounded-md bg-white/5" />
      </div>

      {/* Tab bar skeleton */}
      <div className="mb-8 flex gap-1 border-b border-white/8 pb-0">
        {[80, 72, 96, 64, 72, 64, 48].map((w, i) => (
          <div key={i} className="mb-[-1px] h-10 animate-pulse rounded-t-lg bg-white/6 px-4" style={{ width: w }} />
        ))}
      </div>

      {/* Content cards skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-48 animate-pulse rounded-2xl bg-white/5 border border-white/8" />
          <div className="h-64 animate-pulse rounded-2xl bg-white/5 border border-white/8" />
        </div>
        <div className="space-y-6">
          <div className="h-40 animate-pulse rounded-2xl bg-white/5 border border-white/8" />
          <div className="h-56 animate-pulse rounded-2xl bg-white/5 border border-white/8" />
        </div>
      </div>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

interface ErrorStateProps {
  message: string;
  isNotFound: boolean;
  onRetry: () => void;
}

function ErrorState({ message, isNotFound, onRetry }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/5">
        <AlertTriangle className="h-7 w-7 text-white/60" />
      </div>

      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-white">
        {isNotFound ? "Model not found" : "Failed to load model"}
      </h1>
      <p className="mb-8 text-sm leading-relaxed text-white/50">{message}</p>

      {!isNotFound && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      )}
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ModelDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params?.slug ?? "");

  const [model, setModel] = useState<ModelDetailViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; isNotFound: boolean } | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/models/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (res.status === 404) throw Object.assign(new Error("This model does not exist or has been removed."), { isNotFound: true });
        if (!res.ok) throw new Error(`Server error ${res.status} — please try again shortly.`);
        return res.json();
      })
      .then((json: { data: ModelDetailViewModel }) => {
        setModel(json.data);
      })
      .catch((err: Error & { isNotFound?: boolean }) => {
        setError({ message: err.message, isNotFound: err.isNotFound ?? false });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (slug) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const fontVars = {
    "--font-sans": "'Geist', 'Geist Fallback'",
    "--font-mono": "'Geist Mono', 'Geist Mono Fallback'",
  } as CSSProperties;

  return (
    <main className="dark relative min-h-screen bg-black text-white font-sans" style={fontVars}>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(165,243,208,0.12)_0%,transparent_30%),radial-gradient(circle_at_88%_12%,rgba(255,158,141,0.1)_0%,transparent_32%),radial-gradient(circle_at_54%_100%,rgba(179,157,219,0.1)_0%,transparent_42%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative z-10">
        {loading && <ModelDetailSkeleton />}

        {!loading && error && (
          <ErrorState
            message={error.message}
            isNotFound={error.isNotFound}
            onRetry={load}
          />
        )}

        {!loading && !error && model && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <ModelDetailView model={model} />
          </motion.div>
        )}
      </div>
    </main>
  );
}
