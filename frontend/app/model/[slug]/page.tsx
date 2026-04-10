import type { Metadata } from "next";
import type { CSSProperties } from "react";

import { Navigation } from "@/components/navigation";
import { ModelDetailView } from "@/components/models/model-detail-view";
import { decodeModelSlug, getModelDetailMock } from "@/lib/mock/model-detail";

interface ModelDetailPageProps {
  params: {
    slug: string;
  };
}

export function generateMetadata({ params }: ModelDetailPageProps): Metadata {
  const decodedSlug = decodeModelSlug(params.slug);
  const model = getModelDetailMock(decodedSlug);

  return {
    title: `${model.hero.name} - Models - ZKai`,
    description: model.hero.description,
  };
}

export default function ModelDetailPage({ params }: ModelDetailPageProps) {
  const decodedSlug = decodeModelSlug(params.slug);
  const model = getModelDetailMock(decodedSlug);

  const fontVars = {
    "--font-sans": "'Geist', 'Geist Fallback'",
    "--font-mono": "'Geist Mono', 'Geist Mono Fallback'",
  } as CSSProperties;

  return (
    <main className="dark relative min-h-screen bg-black text-white font-sans" style={fontVars}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(94,234,212,0.11)_0%,transparent_32%),radial-gradient(circle_at_88%_8%,rgba(34,211,238,0.09)_0%,transparent_35%),radial-gradient(circle_at_50%_98%,rgba(251,191,36,0.08)_0%,transparent_42%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <Navigation forceTransparent />

      <div className="relative z-10">
        <ModelDetailView model={model} />
      </div>
    </main>
  );
}
