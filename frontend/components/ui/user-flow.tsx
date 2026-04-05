"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { User, CreditCard, Key, GitFork, Mail, Globe } from "lucide-react";

function SignupVisual() {
  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5">
        <User className="h-4 w-4 text-white/40" />
        <div className="h-2 w-28 rounded-full bg-white/15" />
      </div>
      <div className="flex gap-2 pt-1">
        {[Globe, GitFork, Mail].map((Icon, i) => (
          <div
            key={i}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5"
          >
            <Icon className="h-4 w-4 text-white/50" />
          </div>
        ))}
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
          <svg className="h-4 w-4 text-white/50" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function BuyCreditsVisual() {
  const transactions = [
    { date: "Apr 1", amount: "$99", desc: "Pro Plan" },
    { date: "Mar 30", amount: "$10", desc: "Top-up" },
  ];
  return (
    <div className="mt-5 space-y-2">
      <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5">
        <CreditCard className="h-4 w-4 text-white/40" />
        <div className="h-2 w-24 rounded-full bg-white/15" />
        <div className="ml-auto h-2 w-10 rounded-full bg-white/15" />
      </div>
      <div className="space-y-1.5 pt-1">
        {transactions.map((tx, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-md border border-white/5 bg-white/[0.03] px-4 py-2"
          >
            <span className="text-xs text-white/40">{tx.date}</span>
            <span className="text-xs text-white/30">{tx.desc}</span>
            <span className="text-xs font-medium text-white/60">{tx.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApiKeyVisual() {
  return (
    <div className="mt-5 space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5">
        <Key className="h-4 w-4 text-white/40" />
        <span className="text-xs text-white/30">ZKAI_API_KEY</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
        <span className="font-mono text-sm tracking-widest text-white/25">
          ••••••••••••••••••••
        </span>
        <button className="ml-auto rounded border border-white/10 px-2 py-0.5 text-[10px] text-white/30 hover:text-white/50 transition-colors">
          copy
        </button>
      </div>
      <p className="pt-1 text-xs text-white/25">
        Fully{" "}
        <span className="text-[#B39DDB]/70 underline underline-offset-2">OpenAI compatible</span>
        . Drop-in replacement.
      </p>
    </div>
  );
}

const steps = [
  {
    num: 1,
    title: "Signup",
    desc: "Create an account to get started. You can set up an org for your team later.",
    visual: <SignupVisual />,
    accent: "#FF9E8D",
  },
  {
    num: 2,
    title: "Buy Credits",
    desc: "Credits can be used with any model or provider. They never expire.",
    visual: <BuyCreditsVisual />,
    accent: "#B39DDB",
  },
  {
    num: 3,
    title: "Get Your API Key",
    desc: "Create an API key and start making private, verified requests instantly.",
    visual: <ApiKeyVisual />,
    accent: "#A5F3D0",
  },
];

export default function UserFlow() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="relative bg-black px-6 py-24">
      {/* top connector line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-6xl">
        <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* connecting line between steps (desktop) */}
          <div className="absolute top-7 left-[calc(50%/3+2rem)] right-[calc(50%/3+2rem)] hidden h-px md:block">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              style={{ transformOrigin: "left" }}
              className="h-full bg-gradient-to-r from-white/10 via-white/20 to-white/10"
            />
          </div>

          {steps.map(({ num, title, desc, visual, accent }, idx) => (
            <motion.div
              key={num}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.1 + idx * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 backdrop-blur-sm transition-all duration-500 hover:border-white/15 hover:bg-white/[0.05]"
            >
              {/* step number badge */}
              <div
                className="mb-4 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-black"
                style={{ background: accent }}
              >
                {num}
              </div>

              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/45">{desc}</p>
              {visual}

              {/* subtle glow on hover */}
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(ellipse at 30% 30%, ${accent}08 0%, transparent 70%)`,
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* bottom connector line */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
}
