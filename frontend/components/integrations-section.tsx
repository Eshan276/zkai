"use client";

import { motion, type Variants } from "framer-motion";

type Integration = {
  name: string;
  category: string;
  accent: string;
};

const integrations: Integration[] = [
  { name: "OpenAI SDK", category: "Client API", accent: "#FF9E8D" },
  { name: "LangChain", category: "Orchestration", accent: "#B39DDB" },
  { name: "Midnight", category: "Settlement Layer", accent: "#A5F3D0" },
  { name: "Gramine", category: "TEE Runtime", accent: "#FFF9C4" },
  { name: "Docker", category: "Provider Runtime", accent: "#FFCC80" },
  { name: "llama.cpp", category: "Inference Engine", accent: "#4DD0E1" },
  { name: "Qwen", category: "Model Family", accent: "#FF9E8D" },
  { name: "Claude", category: "Model Routing", accent: "#B39DDB" },
  { name: "GPT-4o", category: "Model Routing", accent: "#A5F3D0" },
  { name: "Mistral", category: "Model Routing", accent: "#FFF9C4" },
  { name: "Python SDK", category: "Developer Tooling", accent: "#FFCC80" },
  { name: "TypeScript SDK", category: "Developer Tooling", accent: "#4DD0E1" },
];

const sectionVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.56,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

const viewport = {
  once: true,
  amount: 0.12,
  margin: "0px 0px -8% 0px",
} as const;

function MarqueeRow({
  items,
  reverse = false,
}: {
  items: Integration[];
  reverse?: boolean;
}) {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-black to-transparent" />

      <motion.div
        className="flex w-max gap-5"
        animate={reverse ? { x: ["-50%", "0%"] } : { x: ["0%", "-50%"] }}
        transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
      >
        {[0, 1].map((copyIndex) => (
          <div key={copyIndex} className="flex shrink-0 gap-5">
            {items.map((integration) => (
              <div
                key={`${integration.name}-${copyIndex}-${reverse ? "rev" : "fwd"}`}
                className="group min-w-[220px] shrink-0 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-5 transition-all duration-300 hover:border-white/25 hover:bg-white/[0.05]"
                style={{
                  boxShadow: `inset 0 1px 0 ${integration.accent}22`,
                }}
              >
                <div className="text-base font-semibold tracking-tight text-white transition-transform duration-300 group-hover:translate-x-1">
                  {integration.name}
                </div>
                <div className="mt-1 text-sm text-white/45">{integration.category}</div>
              </div>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export default function IntegrationsSection() {
  return (
    <motion.section
      id="integrations"
      className="relative overflow-hidden bg-black py-24 lg:py-32"
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_100%,rgba(179,157,219,0.12)_0%,transparent_40%)]" />

      <div className="relative z-10 mx-auto mb-14 max-w-[1400px] px-6 text-center lg:mb-20 lg:px-12">
        <motion.div variants={fadeUp} className="mx-auto max-w-3xl">
          <span className="mb-6 inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-white/40">
            <span className="h-px w-8 bg-white/25" />
            Integrations
            <span className="h-px w-8 bg-white/25" />
          </span>
          <h2 className="mb-6 text-4xl font-semibold tracking-tight text-white lg:text-6xl">
            Plugs into your existing AI stack.
          </h2>
          <p className="text-lg leading-relaxed text-white/55 lg:text-xl">
            OpenAI-compatible clients, TEE runtimes, model routing, and Midnight settlement in one
            pipeline.
          </p>
        </motion.div>
      </div>

      <motion.div variants={fadeUp} className="relative z-10 mb-5">
        <MarqueeRow items={integrations} />
      </motion.div>

      <motion.div variants={fadeUp} className="relative z-10">
        <MarqueeRow items={[...integrations].reverse()} reverse />
      </motion.div>
    </motion.section>
  );
}
