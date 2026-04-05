import Spline from '@splinetool/react-spline/next';

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

export default function Home() {
  return (
    <main className="relative w-full bg-black">
      <ScrollProgress />
      {/* ── Hero (Spline) ─────────────────────────────────────────── */}
      <div className="spline-container relative h-screen w-full overflow-hidden bg-black">
        <Spline scene="https://prod.spline.design/B8J1g8wI37Zc4ij3/scene.splinecode" />

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
