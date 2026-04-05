"use client";

import { useEffect, useState } from "react";

const STATS = [
  { value: "Lower Cost", label: "compared to traditional AI routers", company: "PAYG ROUTING" },
  { value: "Full Privacy", label: "encrypted prompts from client to enclave", company: "TEE + ZK" },
  { value: "Low Latency", label: "smart provider routing for faster responses", company: "GLOBAL NETWORK" },
  { value: "Verifiable", label: "attested inference and trusted settlement", company: "MIDNIGHT" },
] as const;

export default function HeroBlendStrip() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const fade = `transition-all duration-700 delay-500 ${
    isVisible ? "opacity-100" : "opacity-0"
  }`;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-[20] ${fade}`}
      style={{ top: "calc(100vh - 6rem)" }}
    >
      <div className="w-full overflow-hidden px-4">
        <div className="hero-marquee-track flex w-max gap-16">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-10 whitespace-nowrap md:gap-16">
              {STATS.map((stat) => (
                <div
                  key={`${stat.company}-${i}`}
                  className="flex items-baseline gap-3 md:gap-4"
                >
                  <span className="text-2xl font-semibold tracking-tight text-white/95 sm:text-3xl md:text-4xl lg:text-5xl">
                    {stat.value}
                  </span>
                  <span className="text-xs text-white/45 sm:text-sm">
                    {stat.label}
                    <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-widest text-white/35 md:text-xs">
                      {stat.company}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
