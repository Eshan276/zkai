"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";

type Step = {
  number: string;
  title: string;
  description: string;
  accent: string;
  code: string;
  file: string;
  status: string;
};

const steps: Step[] = [
  {
    number: "I",
    title: "Connect wallet and route provider",
    description:
      "Initialize the ZKai SDK with your wallet key and target model. ZKai selects a provider from the registry and fetches enclave metadata.",
    accent: "#FF9E8D",
    file: "client.ts",
    status: "Provider selected",
    code: `import { ZKai } from "zkai";

const client = new ZKai({
  apiKey: process.env.ZKAI_API_KEY!,
  walletKey: process.env.ZKAI_WALLET_KEY!,
  model: "qwen2.5-1.5b",
});`,
  },
  {
    number: "II",
    title: "Encrypt prompt and run inference",
    description:
      "Prompts are encrypted on the client, decrypted only inside TEE, and executed against the selected model. Providers never see plaintext data.",
    accent: "#B39DDB",
    file: "inference.ts",
    status: "Inference completed",
    code: `const response = await client.chat.completions.create({
  model: "qwen2.5-1.5b",
  messages: [
    { role: "system", content: "You are a precise assistant." },
    { role: "user", content: "Summarize this contract update." }
  ]
});

console.log(response.choices[0].message.content);`,
  },
  {
    number: "III",
    title: "Verify attestation and settle escrow",
    description:
      "Every run includes attestation checks and usage accounting. The proof hash is verified on Midnight and escrow finalizes payment after validation.",
    accent: "#A5F3D0",
    file: "settlement.ts",
    status: "Attested on Midnight",
    code: `const receipt = await client.verifyAndSettle({
  attestation: response.attestation,
  maxCostDust: "0.25",
});

console.log("job", receipt.jobId);
console.log("proof", receipt.proofHash);
console.log("status", receipt.status);`,
  },
];

const sectionVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
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
      duration: 0.58,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

const viewport = {
  once: true,
  amount: 0.12,
  margin: "0px 0px -10% 0px",
} as const;

function CodePanel({ step, activeStep }: { step: Step; activeStep: number }) {
  const lines = step.code.split("\n");

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex gap-2">
          <div className="h-3 w-3 rounded-full bg-white/20" />
          <div className="h-3 w-3 rounded-full bg-white/20" />
          <div className="h-3 w-3 rounded-full bg-white/20" />
        </div>
        <span className="font-mono text-xs tracking-[0.14em] text-white/40">{step.file}</span>
      </div>

      <div className="min-h-[310px] p-8 font-mono text-sm">
        <AnimatePresence mode="wait">
          <motion.pre
            key={`${activeStep}-code`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="text-white/75"
          >
            {lines.map((line, lineIndex) => (
              <motion.div
                key={`${activeStep}-${lineIndex}`}
                initial={{ opacity: 0, x: -8, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                transition={{
                  duration: 0.32,
                  delay: lineIndex * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="leading-loose"
              >
                <span className="inline-block w-8 select-none text-white/25">{lineIndex + 1}</span>
                <span>{line || "\u00A0"}</span>
              </motion.div>
            ))}
          </motion.pre>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3 border-t border-white/10 px-6 py-4">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: step.accent, boxShadow: `0 0 16px ${step.accent}99` }}
        />
        <span className="font-mono text-xs text-white/45">{step.status}</span>
      </div>
    </div>
  );
}

export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((current) => (current + 1) % steps.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.section
      id="how-it-works"
      className="relative overflow-hidden bg-black px-6 py-24 lg:py-32"
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.045]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px)",
          }}
        />
      </div>

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,158,141,0.16)_0%,transparent_45%),radial-gradient(circle_at_82%_0%,rgba(179,157,219,0.12)_0%,transparent_40%)]" />

      <div className="relative z-10 mx-auto max-w-[1400px]">
        <motion.div variants={fadeUp} className="mb-16 lg:mb-24">
          <span className="mb-6 inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-white/40">
            <span className="h-px w-8 bg-white/25" />
            Process
          </span>
          <h2 className="text-4xl font-semibold tracking-tight text-white lg:text-6xl">
            Three steps.
            <br />
            <span className="text-white/55">Private inference, verified end to end.</span>
          </h2>
        </motion.div>

        <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
          <motion.div variants={sectionVariants}>
            {steps.map((step, index) => {
              const isActive = activeStep === index;
              return (
                <motion.button
                  key={step.number}
                  type="button"
                  onClick={() => setActiveStep(index)}
                  variants={fadeUp}
                  className={`group w-full border-b border-white/10 py-8 text-left transition-all duration-500 ${
                    isActive ? "opacity-100" : "opacity-45 hover:opacity-80"
                  }`}
                >
                  <div className="flex items-start gap-6">
                    <span
                      className="text-3xl font-semibold"
                      style={{ color: isActive ? step.accent : "rgba(255,255,255,0.25)" }}
                    >
                      {step.number}
                    </span>
                    <div className="flex-1">
                      <h3 className="mb-3 text-2xl font-semibold tracking-tight text-white transition-transform duration-300 group-hover:translate-x-1.5 lg:text-3xl">
                        {step.title}
                      </h3>
                      <p className="leading-relaxed text-white/60">{step.description}</p>

                      <div className="mt-4 h-px overflow-hidden bg-white/15">
                        {isActive ? (
                          <motion.div
                            key={`progress-${step.number}`}
                            className="h-full"
                            style={{ backgroundColor: step.accent }}
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 5, ease: "linear" }}
                          />
                        ) : (
                          <div className="h-full w-0" />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          <motion.div variants={fadeUp} className="self-start lg:sticky lg:top-28">
            <CodePanel step={steps[activeStep]} activeStep={activeStep} />
          </motion.div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </motion.section>
  );
}
