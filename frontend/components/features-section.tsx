"use client";

import { motion, type Variants } from "framer-motion";

type VisualType = "deploy" | "ai" | "collab" | "security";

type Feature = {
  number: string;
  title: string;
  description: string;
  visual: VisualType;
  accent: string;
};

const features: Feature[] = [
  {
    number: "01",
    title: "Encrypted Prompt Pipeline",
    description:
      "Prompts are encrypted on the client and decrypted only inside TEE execution. Providers process jobs without seeing raw user input.",
    visual: "deploy",
    accent: "#FF9E8D",
  },
  {
    number: "02",
    title: "Smart Provider Routing",
    description:
      "Route each request to the best available provider based on capability, latency, and price for more consistent user experience.",
    visual: "ai",
    accent: "#B39DDB",
  },
  {
    number: "03",
    title: "Verifiable Attestation",
    description:
      "Every inference can produce attestations tied to runtime and model integrity, anchored for independent verification.",
    visual: "collab",
    accent: "#FFF9C4",
  },
  {
    number: "04",
    title: "Escrow-Based Settlement",
    description:
      "Usage-based payments settle through escrow with provider stake and proof checks, reducing trust risk for both sides.",
    visual: "security",
    accent: "#A5F3D0",
  },
];

const sectionVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.62,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

const viewport = {
  once: true,
  amount: 0.12,
  margin: "0px 0px -8% 0px",
} as const;

function DeployVisual({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <defs>
        <clipPath id="deployClip">
          <rect x="30" y="20" width="140" height="120" rx="4" />
        </clipPath>
      </defs>

      <rect
        x="30"
        y="20"
        width="140"
        height="120"
        rx="4"
        fill="none"
        stroke={accent}
        strokeWidth="2"
      />

      <g clipPath="url(#deployClip)">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.rect
            key={i}
            x="40"
            y={35 + i * 16}
            width="110"
            height="10"
            rx="2"
            fill={accent}
            opacity="0.18"
            animate={{ opacity: [0.18, 0.86, 0.18], width: [30, 120, 30] }}
            transition={{
              duration: 2,
              delay: i * 0.14,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          />
        ))}
      </g>

      <motion.circle
        cx="100"
        cy="154"
        r="3"
        fill={accent}
        opacity="0.3"
        animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

function AIVisual({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <motion.circle
        cx="100"
        cy="80"
        r="12"
        fill={accent}
        animate={{ r: [12, 14, 12] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "100px 80px" }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const angle = (i * 60 * Math.PI) / 180;
          const radius = 50;
          const x = Math.round((100 + Math.cos(angle) * radius) * 100) / 100;
          const y = Math.round((80 + Math.sin(angle) * radius) * 100) / 100;

          return (
            <g key={i}>
              <line x1="100" y1="80" x2={x} y2={y} stroke={accent} strokeWidth="1" opacity="0.35" />
              <motion.circle
                cx={x}
                cy={y}
                r="6"
                fill="none"
                stroke={accent}
                strokeWidth="2"
                animate={{ r: [6, 8, 6] }}
                transition={{
                  duration: 2.2,
                  delay: i * 0.15,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </g>
          );
        })}
      </motion.g>

      <motion.circle
        cx="100"
        cy="80"
        r="24"
        fill="none"
        stroke={accent}
        strokeWidth="1"
        opacity="0.45"
        animate={{ r: [20, 60], opacity: [0.45, 0] }}
        transition={{ duration: 2.3, repeat: Infinity, ease: "easeOut" }}
      />
    </svg>
  );
}

function CollabVisual({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <g>
        <rect x="30" y="50" width="50" height="60" rx="4" fill="none" stroke={accent} strokeWidth="2" />
        <text x="55" y="85" textAnchor="middle" fontSize="20" fontFamily="monospace" fill={accent}>
          A
        </text>
        <circle cx="55" cy="35" r="12" fill="none" stroke={accent} strokeWidth="2" />
      </g>

      <g>
        <rect x="120" y="50" width="50" height="60" rx="4" fill="none" stroke={accent} strokeWidth="2" />
        <text x="145" y="85" textAnchor="middle" fontSize="20" fontFamily="monospace" fill={accent}>
          B
        </text>
        <circle cx="145" cy="35" r="12" fill="none" stroke={accent} strokeWidth="2" />
      </g>

      <motion.line
        x1="80"
        y1="80"
        x2="120"
        y2="80"
        stroke={accent}
        strokeWidth="2"
        strokeDasharray="4 4"
        animate={{ strokeDashoffset: [0, -8] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
      />

      <motion.circle
        cx="80"
        cy="80"
        r="4"
        fill={accent}
        animate={{ cx: [80, 120, 80] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.circle
        cx="100"
        cy="130"
        r="6"
        fill="none"
        stroke={accent}
        strokeWidth="2"
        animate={{ r: [6, 10, 6], opacity: [1, 0.3, 1] }}
        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

function SecurityVisual({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <path
        d="M 100 20 L 150 40 L 150 90 Q 150 130 100 145 Q 50 130 50 90 L 50 40 Z"
        fill="none"
        stroke={accent}
        strokeWidth="2"
      />

      <motion.path
        d="M 100 35 L 135 50 L 135 85 Q 135 115 100 128 Q 65 115 65 85 L 65 50 Z"
        fill={accent}
        opacity="0.12"
        animate={{ opacity: [0.12, 0.28, 0.12] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      <rect x="85" y="70" width="30" height="25" rx="3" fill={accent} />
      <path
        d="M 90 70 L 90 60 Q 90 50 100 50 Q 110 50 110 60 L 110 70"
        fill="none"
        stroke={accent}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="100" cy="80" r="4" fill="black" />
      <rect x="98" y="82" width="4" height="8" fill="black" />

      <motion.line
        x1="62"
        y1="40"
        x2="138"
        y2="40"
        stroke={accent}
        strokeWidth="1"
        opacity="0"
        animate={{ y1: [40, 120, 40], y2: [40, 120, 40], opacity: [0, 0.45, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

function AnimatedVisual({ type, accent }: { type: VisualType; accent: string }) {
  switch (type) {
    case "deploy":
      return <DeployVisual accent={accent} />;
    case "ai":
      return <AIVisual accent={accent} />;
    case "collab":
      return <CollabVisual accent={accent} />;
    case "security":
      return <SecurityVisual accent={accent} />;
    default:
      return <DeployVisual accent={accent} />;
  }
}

function FeatureRow({ feature }: { feature: Feature }) {
  return (
    <motion.div variants={fadeUp} className="group relative">
      <div className="flex flex-col gap-8 border-b border-white/10 py-12 lg:flex-row lg:gap-16 lg:py-20">
        <div className="shrink-0">
          <span className="font-mono text-sm tracking-[0.14em] text-white/40">{feature.number}</span>
        </div>

        <div className="grid flex-1 items-center gap-8 lg:grid-cols-2">
          <div>
            <h3
              className="mb-4 text-3xl font-semibold tracking-tight text-white transition-transform duration-500 group-hover:translate-x-1.5 lg:text-4xl"
              style={{ textShadow: `0 0 28px ${feature.accent}22` }}
            >
              {feature.title}
            </h3>
            <p className="text-lg leading-relaxed text-white/55">{feature.description}</p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <motion.div
              className="h-40 w-48 rounded-xl border border-white/10 bg-white/[0.02] p-3"
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <AnimatedVisual type={feature.visual} accent={feature.accent} />
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function FeaturesSection() {
  return (
    <motion.section
      id="capabilities"
      className="relative bg-black px-6 py-24 lg:py-32"
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />

      <div className="mx-auto max-w-[1400px]">
        <motion.div variants={fadeUp} className="mb-16 lg:mb-24">
          <span className="mb-6 inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-white/40">
            <span className="h-px w-8 bg-white/25" />
            Capabilities
          </span>

          <h2 className="text-4xl font-semibold tracking-tight text-white lg:text-6xl">
            Private AI inference.
            <br />
            <span className="text-white/55">Built for speed and trust.</span>
          </h2>
        </motion.div>

        <motion.div variants={sectionVariants}>
          {features.map((feature) => (
            <FeatureRow key={feature.number} feature={feature} />
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
