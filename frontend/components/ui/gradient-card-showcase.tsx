"use client";

import { motion } from "framer-motion";

const sectionVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.06,
    },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 56, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.65,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
} as const;

const viewport = {
  once: true,
  amount: 0.15,
  margin: "0px 0px -12% 0px",
} as const;

/** Gradients aligned with Spline hero: peach, lavender/periwinkle, buttery yellow, mint */
const cards = [
  {
    title: "Zero-Knowledge Privacy",
    desc: "Your prompts never leave your machine in plaintext. ZK proofs verify inference without exposing inputs.",
    gradientFrom: "#FF9E8D",
    gradientTo: "#E57373",
  },
  {
    title: "Any Model, One API",
    desc: "Route to GPT-4, Claude, Mistral, and more through a single OpenAI-compatible endpoint.",
    gradientFrom: "#B39DDB",
    gradientTo: "#7986CB",
  },
  {
    title: "Pay-As-You-Go Credits",
    desc: "Credits never expire. Buy once, use across every model and provider with no hidden fees.",
    gradientFrom: "#FFF9C4",
    gradientTo: "#FFCC80",
  },
  {
    title: "On-Chain Attestation",
    desc: "Every inference is attested on Midnight blockchain — cryptographic proof your AI ran correctly.",
    gradientFrom: "#A5F3D0",
    gradientTo: "#4DD0E1",
  },
];

export default function SkewCards() {
  return (
    <motion.div
      className="flex flex-wrap items-center justify-center bg-black py-16"
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
    >
      {cards.map(({ title, desc, gradientFrom, gradientTo }, idx) => (
        <motion.div
          key={idx}
          variants={cardVariants}
          className="group relative m-[40px_30px] h-[400px] w-[280px] transition-all duration-500"
        >
          <span
            className="absolute top-0 left-[50px] h-full w-1/2 skew-x-[15deg] rounded-lg transition-all duration-500 group-hover:left-[20px] group-hover:w-[calc(100%-90px)] group-hover:skew-x-0"
            style={{
              background: `linear-gradient(315deg, ${gradientFrom}, ${gradientTo})`,
            }}
          />
          <span
            className="absolute top-0 left-[50px] h-full w-1/2 skew-x-[15deg] rounded-lg blur-[30px] transition-all duration-500 group-hover:left-[20px] group-hover:w-[calc(100%-90px)] group-hover:skew-x-0"
            style={{
              background: `linear-gradient(315deg, ${gradientFrom}, ${gradientTo})`,
            }}
          />

          <span className="pointer-events-none absolute inset-0 z-10">
            <span className="animate-blob absolute top-0 left-0 h-0 w-0 rounded-lg bg-[rgba(255,255,255,0.1)] opacity-0 shadow-[0_5px_15px_rgba(0,0,0,0.08)] backdrop-blur-[10px] transition-all duration-100 group-hover:top-[-50px] group-hover:left-[50px] group-hover:h-[100px] group-hover:w-[100px] group-hover:opacity-100" />
            <span className="animate-blob animation-delay-1000 absolute right-0 bottom-0 h-0 w-0 rounded-lg bg-[rgba(255,255,255,0.1)] opacity-0 shadow-[0_5px_15px_rgba(0,0,0,0.08)] backdrop-blur-[10px] transition-all duration-500 group-hover:right-[50px] group-hover:bottom-[-50px] group-hover:h-[100px] group-hover:w-[100px] group-hover:opacity-100" />
          </span>

          <div className="relative left-0 z-20 rounded-lg bg-[rgba(255,255,255,0.05)] p-[20px_40px] text-white shadow-lg backdrop-blur-[10px] transition-all duration-500 group-hover:left-[-25px] group-hover:p-[60px_40px]">
            <h2 className="mb-2 text-xl font-semibold">{title}</h2>
            <p className="mb-2 text-base leading-relaxed text-white/70">{desc}</p>
            <a
              href="#"
              className="inline-block rounded bg-white px-3 py-2 text-sm font-bold text-black hover:border hover:border-[#B39DDB]/50 hover:bg-[#FFF9C4] hover:shadow-md"
            >
              Learn More
            </a>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
