import { Navigation } from "@/components/navigation";
import { ModelsContent } from "@/components/models/models-content";
import type { CSSProperties } from "react";

export const metadata = {
  title: "Models - ZKai",
  description: "Explore models optimized for private, verifiable inference on ZKai and Midnight.",
};

export default function ModelsPage() {
  const fontVars = {
    "--font-sans": "'Geist', 'Geist Fallback'",
    "--font-mono": "'Geist Mono', 'Geist Mono Fallback'",
  } as CSSProperties;

  return (
    <main
      className="dark relative h-screen overflow-hidden bg-black text-white font-sans"
      style={fontVars}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(165,243,208,0.12)_0%,transparent_30%),radial-gradient(circle_at_88%_12%,rgba(255,158,141,0.1)_0%,transparent_32%),radial-gradient(circle_at_54%_100%,rgba(179,157,219,0.1)_0%,transparent_42%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <Navigation forceTransparent />

      {/* pt-20 offsets the fixed floating nav (h-14 + top-4 spacing) */}
      <div className="relative z-10 flex h-full min-h-0 flex-col box-border pt-20">
        <ModelsContent />
      </div>
    </main>
  );
}
