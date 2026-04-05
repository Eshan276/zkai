"use client";

import { motion, type Variants } from "framer-motion";
import { Shield, Lock, Eye, FileCheck } from "lucide-react";

const securityFeatures = [
  {
    icon: Shield,
    title: "TEE-Isolated Execution",
    description:
      "Inference runs inside a Trusted Execution Environment so prompts are decrypted only in enclave memory.",
  },
  {
    icon: Lock,
    title: "End-to-End Prompt Encryption",
    description:
      "Client-side encryption protects inputs and outputs in transit; providers process ciphertext until enclave decryption.",
  },
  {
    icon: Eye,
    title: "Verifiable Attestation",
    description:
      "Every job includes attestations tied to model and runtime integrity, with hashes anchored on Midnight.",
  },
  {
    icon: FileCheck,
    title: "Escrow + Provider Stake",
    description:
      "Usage is settled through escrow with provider staking, so payment and execution integrity are enforced together.",
  },
];

const guarantees = [
  "TEE Runtime Isolation",
  "X25519 + ChaCha20-Poly1305",
  "TLS 1.3 Transport",
  "On-Chain Proof Hashes",
  "Escrow Settlement Guardrails",
];

const sectionVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08,
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
      duration: 0.55,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

const fadeRight: Variants = {
  hidden: { opacity: 0, x: 24, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.55,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

const viewport = {
  once: true,
  amount: 0.12,
  margin: "0px 0px -10% 0px",
} as const;

export default function SecuritySection() {
  return (
    <motion.section
      id="security"
      className="relative overflow-hidden bg-black px-6 py-24 lg:py-32"
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
          <motion.div variants={fadeUp}>
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-white/40">
              <span className="h-px w-8 bg-white/25" />
              Security
            </span>

            <h2 className="mb-8 text-4xl font-semibold tracking-tight text-white lg:text-6xl">
              Trust is
              <br />
              non-negotiable.
            </h2>

            <p className="mb-12 max-w-xl text-lg leading-relaxed text-white/58 lg:text-xl">
              ZKai is built for private AI by default: encrypted prompts, TEE execution, and
              verifiable settlement across the entire inference lifecycle.
            </p>

            <div className="flex flex-wrap gap-3">
              {guarantees.map((item) => (
                <span
                  key={item}
                  className="rounded-md border border-white/12 bg-white/[0.03] px-4 py-2 font-mono text-xs tracking-[0.12em] text-white/60"
                >
                  {item}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div variants={sectionVariants} className="grid gap-6">
            {securityFeatures.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeRight}
                className="group rounded-xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/12 text-white/75 transition-colors duration-300 group-hover:bg-white group-hover:text-black">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-semibold tracking-tight text-white transition-transform duration-300 group-hover:translate-x-1">
                      {feature.title}
                    </h3>
                    <p className="leading-relaxed text-white/50">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
