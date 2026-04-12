import SplineHero from '@/components/spline-hero';
import { VT323 } from 'next/font/google';
import type { CSSProperties } from 'react';

import SkewCards from '@/components/ui/gradient-card-showcase';
import FaqAccordion from '@/components/ui/faq-accordion';
import ScrollProgress from '@/components/ui/scroll-progress';
import HeroBlendStrip from '@/components/hero-blend-strip';
import FeaturesSection from '@/components/features-section';
import HowItWorksSection from '@/components/how-it-works-section';
import IntegrationsSection from '@/components/integrations-section';
import SecuritySection from '@/components/security-section';
import { CtaSection } from '@/components/cta-section';
import { FooterSection } from '@/components/footer-section';
import { Navigation } from '@/components/navigation';

const heroDisplay = VT323({
  subsets: ['latin'],
  weight: '400',
});

export default function Home() {
  const fontVars = {
    '--font-sans': "'Geist', 'Geist Fallback'",
    '--font-mono': "'Geist Mono', 'Geist Mono Fallback'",
  } as CSSProperties;

  return (
    <main className="relative w-full bg-black font-sans text-white" style={fontVars}>
      <ScrollProgress />
      <Navigation />
      {/* ── Hero (Spline) ─────────────────────────────────────────── */}
      <div className="spline-container relative h-screen w-full overflow-hidden bg-black">
        <SplineHero />

        {/* Bottom-only seam blend so hero text/content remains unaffected. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-28 bg-[linear-gradient(to_top,rgba(0,0,0,0.98)_0%,rgba(0,0,0,0.88)_24%,rgba(0,0,0,0.68)_48%,rgba(0,0,0,0.42)_70%,rgba(0,0,0,0.2)_86%,transparent_100%)] md:h-36"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-[-34px] z-[5] h-24 bg-black/45 blur-[54px]"
          aria-hidden
        />
        <div className="spline-seam-dither pointer-events-none absolute inset-x-0 bottom-0 z-[6] h-28" aria-hidden />

        <div
          className="pointer-events-none absolute bottom-0 right-0 z-[8] h-16 w-[min(14rem,42vw)] bg-black"
          aria-hidden
        />

        <div className="pointer-events-none absolute bottom-28 left-4 z-[12] max-w-[min(44rem,94vw)] -translate-y-2 sm:left-6 md:bottom-40 md:left-10">
          <div className="inline-block w-max max-w-full">
            <h1
              className={`${heroDisplay.className} relative text-[clamp(3.5rem,12vw,8.5rem)] font-normal leading-[0.92] tracking-[-0.03em] text-transparent bg-clip-text [-webkit-text-fill-color:transparent] bg-[linear-gradient(164deg,#f8fafc_0%,#d4d4d8_21%,#ffffff_35%,#9ca3af_57%,#e5e7eb_76%,#f8fafc_100%)] [text-shadow:0_0_16px_rgba(250,252,255,0.42),0_0_36px_rgba(151,164,191,0.35),0_14px_42px_rgba(0,0,0,0.78)]`}
            >
              <span className="block whitespace-nowrap">Use LLMs with</span>
              <span className="block">Privacy</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/72 sm:text-base">
              Route across top models with encrypted prompts, secure enclaves, and verifiable execution by default.
            </p>
          </div>
        </div>

      </div>

      {/* Scroll indicator lives outside the Spline container, anchored at the seam */}
      <HeroBlendStrip />

      {/* ── Feature Cards ─────────────────────────────────────────── */}
      <section
        id="features"
        className="relative z-10 -mt-10 scroll-mt-0 bg-black pt-10 md:-mt-14 md:pt-12"
      >
        <SkewCards />
      </section>

      <FeaturesSection />
      <HowItWorksSection />
      <IntegrationsSection />
      <SecuritySection />
      <CtaSection />

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <FaqAccordion />
      <FooterSection />
    </main>
  );
}
