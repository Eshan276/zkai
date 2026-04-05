"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AnimatedTetrahedron } from "@/components/animated-tetrahedron";

export function CtaSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-black py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div
          className={`relative overflow-hidden rounded-2xl border border-white/15 transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
          onMouseMove={handleMouseMove}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-20 transition-opacity duration-300"
            style={{
              background: `radial-gradient(640px circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(255,255,255,0.18), transparent 42%)`,
            }}
          />

          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0)_45%)]" />

          <div className="relative z-10 px-8 py-16 lg:px-16 lg:py-24">
            <div className="flex flex-col items-center justify-between gap-12 lg:flex-row">
              <div className="flex-1">
                <h2 className="mb-8 text-4xl leading-[0.95] font-semibold tracking-tight text-white lg:text-7xl">
                  Ready to ship
                  <br />
                  private AI at scale?
                </h2>

                <p className="mb-12 max-w-xl text-lg leading-relaxed text-white/58 lg:text-xl">
                  Launch with ZKai using OpenAI-compatible APIs, verifiable attestation, and
                  usage-based settlement on Midnight.
                </p>

                <div className="flex flex-col items-start gap-4 sm:flex-row">
                  <Button
                    size="lg"
                    className="group h-14 rounded-full bg-white px-8 text-base text-black hover:bg-white/90"
                  >
                    Get Api Key
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 rounded-full border-white/25 px-8 text-base text-white hover:bg-white/10"
                  >
                    Explore Models
                  </Button>
                </div>

               
              </div>

              <div className="hidden h-[420px] w-[420px] items-center justify-center lg:flex lg:-mr-10">
                <AnimatedTetrahedron />
              </div>
            </div>
          </div>

          <div className="absolute right-0 top-0 h-28 w-28 border-b border-l border-white/12" />
          <div className="absolute bottom-0 left-0 h-28 w-28 border-r border-t border-white/12" />
        </div>
      </div>
    </section>
  );
}
