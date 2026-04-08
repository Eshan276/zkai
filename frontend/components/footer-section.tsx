"use client";

import { ArrowUpRight } from "lucide-react";

import { AnimatedWave } from "./animated-wave";

type FooterLink = {
  name: string;
  href: string;
  badge?: string;
};

const footerLinks: Record<string, readonly FooterLink[]> = {
  Product: [
    { name: "Features", href: "#features" },
    { name: "How it works", href: "#how-it-works" },
    { name: "Integrations", href: "#integrations" },
    { name: "Security", href: "#security" },
  ],
  Developers: [
    { name: "Documentation", href: "#developers" },
    { name: "API Reference", href: "#" },
    { name: "SDK", href: "#developers" },
    { name: "Status", href: "#" },
  ],
} as const;

const socialLinks = [
  { name: "Twitter", href: "#" },
  { name: "GitHub", href: "https://github.com/Eshan276/zkai" },
  { name: "LinkedIn", href: "#" },
] as const;

export function FooterSection() {
  return (
    <footer className="relative border-t border-white/10 bg-black">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-45">
        <AnimatedWave />
      </div>

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="py-12 lg:py-14">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:gap-8">
            <div className="col-span-2">
              <a href="#" className="mb-6 inline-flex items-center gap-2">
                <span className="text-2xl font-semibold tracking-tight text-white">ZKai</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">TM</span>
              </a>

              <p className="mb-8 max-w-xs leading-relaxed text-white/50">
                Private AI inference with encrypted prompts, attested execution, and settlement on
                Midnight.
              </p>

              <div className="flex gap-6">
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="group flex items-center gap-1 text-sm text-white/55 transition-colors hover:text-white"
                  >
                    {link.name}
                    <ArrowUpRight className="-translate-x-1 h-3 w-3 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </a>
                ))}
              </div>
            </div>

            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h3 className="mb-6 text-sm font-medium text-white">{title}</h3>
                <ul className="space-y-4">
                  {links.map((link) => (
                    <li key={link.name}>
                      <a
                        href={link.href}
                        className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
                      >
                        {link.name}
                        {"badge" in link && link.badge && (
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs text-black">
                            {link.badge}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-8 md:flex-row">
          <p className="text-sm text-white/45">{new Date().getFullYear()} ZKai. All rights reserved.</p>

          <div className="flex items-center gap-4 text-sm text-white/45">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
