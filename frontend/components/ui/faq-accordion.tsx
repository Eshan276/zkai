"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

const sectionVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.08,
    },
  },
} as const;

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
} as const;

const faqViewport = {
  once: true,
  amount: 0.12,
  margin: "0px 0px -10% 0px",
} as const;

const faqs = [
  {
    q: "What is ZKai and how does private AI inference work?",
    a: "ZKai uses zero-knowledge proofs to verify that AI inference was executed correctly without ever exposing your prompts or responses to the provider. Your inputs are encrypted locally and the ZK proof is verified on the Midnight blockchain.",
  },
  {
    q: "Is ZKai compatible with the OpenAI API?",
    a: "Yes — ZKai is a fully drop-in OpenAI-compatible endpoint. Just swap the base URL and your existing code will work with any model or provider routed through ZKai, with the added privacy guarantees.",
  },
  {
    q: "Which AI models can I access through ZKai?",
    a: "ZKai supports GPT-4, Claude 3, Mistral, Llama 3, and many more. New models are added continuously. Credits work across all models — you're never locked into a single provider.",
  },
  {
    q: "How is billing handled? Do credits expire?",
    a: "Credits are pre-purchased and never expire. You can top up at any time. There are no subscription fees — pay only for what you use, at transparent per-token rates.",
  },
  {
    q: "How does on-chain attestation protect me?",
    a: "Every inference request generates a cryptographic attestation stored on the Midnight blockchain. This gives you verifiable proof that the model ran correctly and that your data wasn't tampered with — without revealing the contents of your query.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div variants={fadeUp} className="border-b border-white/[0.07]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-white/90"
      >
        <span className="text-sm font-medium text-white/70 group-hover:text-white/90 md:text-base">
          {q}
        </span>
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="flex-shrink-0"
        >
          <Plus className="h-4 w-4 text-white/30" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-white/40">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FaqAccordion() {
  return (
    <motion.section
      className="relative bg-black px-6 py-24"
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={faqViewport}
    >
      {/* top connector */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-2xl">
        <motion.div variants={fadeUp} className="mb-12 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
            Questions
          </p>
          <h2 className="text-3xl font-light tracking-tight text-white md:text-4xl">
            Frequently asked
          </h2>
        </motion.div>

        <div>
          {faqs.map((faq, idx) => (
            <FaqItem key={idx} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>

      {/* bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-black" />
    </motion.section>
  );
}
