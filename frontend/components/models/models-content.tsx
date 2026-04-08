"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search, Grid3X3, List, X, Check, ChevronDown, Copy,
  Sparkles, MessageSquare, Image, Music, Video, Cpu,
  FileText, Code2, Tag, Settings2, Scissors,
  Building2, UserCircle, SlidersHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Model Data ───────────────────────────────────────────────────────────────

const models = [
  {
    id: "qwen-2.5-72b",
    name: "Qwen 2.5 72B",
    provider: "Alibaba",
    author: "qwen",
    description: "A powerful 72B parameter model optimized for complex reasoning, coding, and multilingual tasks. Features state-of-the-art performance on benchmarks with efficient inference.",
    contextLength: 128000,
    inputPriceRaw: 0.12,
    inputPrice: "$0.12",
    outputPrice: "$0.36",
    tokens: "72B",
    category: "text",
    modalities: ["Text"],
    series: ["Qwen"],
    categories: ["Programming", "Multilingual"],
    supportedParams: ["tools", "temperature", "top_p"],
    distillable: true,
    isNew: true,
    isFree: false,
    isOpenSource: true,
    date: "Apr 3, 2026",
  },
  {
    id: "claude-4-opus",
    name: "Claude 4 Opus",
    provider: "Anthropic",
    author: "anthropic",
    description: "The most capable Claude model for highly complex tasks. Excels at analysis, coding, math, and creative writing with nuanced understanding.",
    contextLength: 200000,
    inputPriceRaw: 15.0,
    inputPrice: "$15.00",
    outputPrice: "$75.00",
    tokens: "400B",
    category: "text",
    modalities: ["Text"],
    series: ["Claude"],
    categories: ["Programming", "Roleplay", "Marketing"],
    supportedParams: ["tools", "temperature", "top_p", "frequency_penalty"],
    distillable: false,
    isNew: false,
    isFree: false,
    isOpenSource: false,
    date: "Mar 28, 2026",
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "OpenAI",
    author: "openai",
    description: "A compact yet powerful model offering excellent performance-to-cost ratio. Ideal for production applications requiring fast inference.",
    contextLength: 128000,
    inputPriceRaw: 0.08,
    inputPrice: "$0.08",
    outputPrice: "$0.24",
    tokens: "8B",
    category: "text",
    modalities: ["Text"],
    series: ["GPT"],
    categories: ["Programming", "Marketing"],
    supportedParams: ["tools", "temperature"],
    distillable: true,
    isNew: true,
    isFree: false,
    isOpenSource: false,
    date: "Apr 1, 2026",
  },
  {
    id: "gemini-3-ultra",
    name: "Gemini 3 Ultra",
    provider: "Google",
    author: "google",
    description: "Google's flagship multimodal model with native image, audio, and video understanding. Supports real-time streaming and complex reasoning.",
    contextLength: 1000000,
    inputPriceRaw: 7.0,
    inputPrice: "$7.00",
    outputPrice: "$21.00",
    tokens: "175B",
    category: "multimodal",
    modalities: ["Text", "Image", "Audio", "Video"],
    series: ["Gemini"],
    categories: ["Programming", "Marketing"],
    supportedParams: ["tools", "temperature", "top_p"],
    distillable: false,
    isNew: true,
    isFree: false,
    isOpenSource: false,
    date: "Apr 2, 2026",
  },
  {
    id: "llama-4-maverick",
    name: "Llama 4 Maverick",
    provider: "Meta",
    author: "meta-llama",
    description: "Open-weights model pushing the boundaries of open-source AI. Excellent for fine-tuning and self-hosted deployments.",
    contextLength: 256000,
    inputPriceRaw: 0.05,
    inputPrice: "$0.05",
    outputPrice: "$0.15",
    tokens: "70B",
    category: "text",
    modalities: ["Text"],
    series: ["Llama"],
    categories: ["Programming", "Roleplay"],
    supportedParams: ["tools", "temperature", "top_p", "seed"],
    distillable: true,
    isNew: true,
    isFree: true,
    isOpenSource: true,
    date: "Mar 30, 2026",
  },
  {
    id: "flux-2-pro",
    name: "Flux 2 Pro",
    provider: "Black Forest Labs",
    author: "black-forest-labs",
    description: "State-of-the-art image generation model with unprecedented photorealism and style control. Supports high-resolution outputs up to 4K.",
    contextLength: 0,
    inputPriceRaw: 0.04,
    inputPrice: "$0.04/img",
    outputPrice: "N/A",
    tokens: "12B",
    category: "image",
    modalities: ["Image"],
    series: ["Flux"],
    categories: ["Marketing"],
    supportedParams: ["seed"],
    distillable: false,
    isNew: false,
    isFree: false,
    isOpenSource: false,
    date: "Mar 15, 2026",
  },
  {
    id: "whisper-v4",
    name: "Whisper V4",
    provider: "OpenAI",
    author: "openai",
    description: "Advanced speech recognition with near-perfect accuracy across 100+ languages. Real-time transcription with speaker diarization.",
    contextLength: 0,
    inputPriceRaw: 0.006,
    inputPrice: "$0.006/min",
    outputPrice: "N/A",
    tokens: "2.5B",
    category: "audio",
    modalities: ["Audio"],
    series: ["Whisper"],
    categories: ["Multilingual"],
    supportedParams: ["temperature"],
    distillable: false,
    isNew: false,
    isFree: false,
    isOpenSource: true,
    date: "Feb 20, 2026",
  },
  {
    id: "mistral-large-3",
    name: "Mistral Large 3",
    provider: "Mistral AI",
    author: "mistralai",
    description: "European-made LLM with strong multilingual capabilities and efficient inference. Optimized for enterprise deployments.",
    contextLength: 128000,
    inputPriceRaw: 2.0,
    inputPrice: "$2.00",
    outputPrice: "$6.00",
    tokens: "123B",
    category: "text",
    modalities: ["Text"],
    series: ["Mistral"],
    categories: ["Programming", "Roleplay", "Marketing"],
    supportedParams: ["tools", "temperature", "top_p"],
    distillable: false,
    isNew: false,
    isFree: false,
    isOpenSource: false,
    date: "Mar 10, 2026",
  },
  {
    id: "sora-2",
    name: "Sora 2",
    provider: "OpenAI",
    author: "openai",
    description: "Revolutionary video generation model creating photorealistic videos from text prompts. Supports up to 2 minutes of HD content.",
    contextLength: 0,
    inputPriceRaw: 0.5,
    inputPrice: "$0.50/sec",
    outputPrice: "N/A",
    tokens: "N/A",
    category: "video",
    modalities: ["Video"],
    series: ["Sora"],
    categories: ["Marketing"],
    supportedParams: ["seed"],
    distillable: false,
    isNew: true,
    isFree: false,
    isOpenSource: false,
    date: "Apr 4, 2026",
  },
  {
    id: "deepseek-r2",
    name: "DeepSeek R2",
    provider: "DeepSeek",
    author: "deepseek-ai",
    description: "Reasoning-focused model with explicit chain-of-thought capabilities. Exceptional at math, coding, and logical puzzles.",
    contextLength: 64000,
    inputPriceRaw: 0.14,
    inputPrice: "$0.14",
    outputPrice: "$0.42",
    tokens: "67B",
    category: "text",
    modalities: ["Text"],
    series: ["DeepSeek"],
    categories: ["Programming"],
    supportedParams: ["temperature", "top_p"],
    distillable: true,
    isNew: true,
    isFree: true,
    isOpenSource: true,
    date: "Apr 2, 2026",
  },
  {
    id: "cohere-command-r-plus",
    name: "Command R+",
    provider: "Cohere",
    author: "cohere",
    description: "Enterprise-grade model optimized for retrieval-augmented generation. Built-in citation and grounding capabilities.",
    contextLength: 128000,
    inputPriceRaw: 3.0,
    inputPrice: "$3.00",
    outputPrice: "$15.00",
    tokens: "104B",
    category: "text",
    modalities: ["Text", "File"],
    series: ["Command"],
    categories: ["Programming", "Marketing"],
    supportedParams: ["tools", "temperature"],
    distillable: false,
    isNew: false,
    isFree: false,
    isOpenSource: false,
    date: "Feb 28, 2026",
  },
  {
    id: "stable-audio-3",
    name: "Stable Audio 3",
    provider: "Stability AI",
    author: "stability-ai",
    description: "Generate high-quality music and sound effects from text descriptions. Supports variable length outputs with stem separation.",
    contextLength: 0,
    inputPriceRaw: 0.02,
    inputPrice: "$0.02/sec",
    outputPrice: "N/A",
    tokens: "1.5B",
    category: "audio",
    modalities: ["Audio"],
    series: ["Stable"],
    categories: ["Marketing"],
    supportedParams: ["seed", "temperature"],
    distillable: false,
    isNew: true,
    isFree: false,
    isOpenSource: false,
    date: "Mar 25, 2026",
  },
];

// ─── Static Config ─────────────────────────────────────────────────────────────

const categoryTabs = [
  { id: "all", label: "All", icon: Sparkles },
  { id: "text", label: "Text", icon: MessageSquare },
  { id: "image", label: "Image", icon: Image },
  { id: "audio", label: "Audio", icon: Music },
  { id: "video", label: "Video", icon: Video },
  { id: "multimodal", label: "Multimodal", icon: Cpu },
];

const sortOptions = [
  { id: "newest", label: "Newest" },
  { id: "popular", label: "Most Popular" },
  { id: "price-low", label: "Price: Low to High" },
  { id: "context", label: "Context Length" },
];

const ALL_PROVIDERS = ["OpenAI", "Anthropic", "Google", "Meta", "Alibaba", "Mistral AI", "DeepSeek", "Cohere", "Black Forest Labs", "Stability AI"];
const ALL_AUTHORS = ["openai", "anthropic", "google", "meta-llama", "qwen", "mistralai", "deepseek-ai", "cohere", "black-forest-labs", "stability-ai"];
const ALL_SERIES = ["GPT", "Claude", "Gemini", "Llama", "Qwen", "Mistral", "DeepSeek", "Command", "Flux", "Whisper", "Sora", "Stable"];
const ALL_CATEGORIES_FILTER = ["Programming", "Roleplay", "Marketing", "Multilingual"];
const ALL_MODALITIES = ["Text", "Image", "File", "Audio", "Video"];
const ALL_PARAMS = ["tools", "temperature", "top_p", "frequency_penalty", "seed"];

// ─── Collapsible Section ───────────────────────────────────────────────────────

function FilterSection({ title, icon: Icon, children, defaultOpen = true }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 text-left group"
      >
        <span className="flex items-center gap-2 text-xs font-medium text-white/60 group-hover:text-white transition-colors uppercase tracking-wider">
          <Icon className="w-3.5 h-3.5" />
          {title}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-white/35 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

// ─── Checkbox Filter Item ──────────────────────────────────────────────────────

function FilterItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2.5 py-1 cursor-pointer group" onClick={onChange}>
      <div
        className={cn(
          "w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all duration-150",
          checked
            ? "bg-white border-white"
            : "border-white/20 group-hover:border-white/45"
        )}
      >
        {checked && <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />}
      </div>
      <span className={cn(
        "text-sm transition-colors",
        checked ? "text-white" : "text-white/50 group-hover:text-white"
      )}>
        {label}
      </span>
    </label>
  );
}

// ─── Range Slider ──────────────────────────────────────────────────────────────

function RangeSlider({ label, min, max, value, onChange, formatMin, formatMax }: {
  label?: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  formatMin: string;
  formatMax: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      {label && <div className="text-xs text-white/45">{label}</div>}
      <div className="relative h-5 flex items-center">
        <div className="w-full h-px bg-white/15 relative">
          <div className="absolute left-0 h-px bg-white transition-all" style={{ width: `${pct}%` }} />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute w-full opacity-0 cursor-pointer h-5"
        />
        <div
          className="absolute w-3 h-3 rounded-full bg-white border-2 border-black shadow-sm pointer-events-none transition-all"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-mono text-white/45">
        <span>{formatMin}</span>
        <span>{formatMax}</span>
      </div>
    </div>
  );
}

// ─── Model Card ────────────────────────────────────────────────────────────────

const modalityIconMap: Record<string, React.ElementType> = {
  text: MessageSquare,
  image: Image,
  audio: Music,
  video: Video,
  multimodal: Cpu,
};

function ModelCard({ model, index, viewMode }: { model: typeof models[0]; index: number; viewMode: "grid" | "list" }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.05 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(model.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const Icon = modalityIconMap[model.category] ?? MessageSquare;
  const delay = `${Math.min(index * 40, 320)}ms`;

  if (viewMode === "list") {
    return (
      <div
        ref={ref}
        className={cn(
          "group border-b border-white/10 transition-all duration-500",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
        style={{ transitionDelay: delay }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6 py-4 px-3 hover:bg-white/[0.03] rounded-lg transition-colors">
          <div className="flex-1 min-w-0 flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.12] transition-colors">
              <Icon className="w-4 h-4 text-white/65" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold leading-tight tracking-tight">{model.name}</h3>
                <button onClick={handleCopy} className="p-0.5 rounded hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100">
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-white/45" />}
                </button>
                {model.isNew && <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-white text-black rounded-full">New</span>}
                {model.isFree && <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-white/10 text-white/75 rounded-full">Free</span>}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-white/45">
                <span>by {model.author}</span>
                <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
                <span>{model.date}</span>
                {model.contextLength > 0 && (
                  <>
                    <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
                    <span className="font-mono">
                      {model.contextLength >= 1000000 ? `${model.contextLength / 1000000}M` : `${model.contextLength / 1000}K`} ctx
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-white/45 mt-1.5 line-clamp-1">{model.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-5 shrink-0 pl-12 lg:pl-0 text-sm">
            <div className="text-right">
              <div className="font-mono text-xs">{model.inputPrice}</div>
              <div className="text-[10px] text-white/35">input/M</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-xs">{model.outputPrice}</div>
              <div className="text-[10px] text-white/35">output/M</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        "group relative bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden transition-all duration-500 hover:border-white/20 hover:bg-white/[0.03] hover:shadow-md hover:-translate-y-0.5",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      )}
      style={{ transitionDelay: delay }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.12] transition-colors">
              <Icon className="w-4 h-4 text-white/65" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-semibold tracking-tight truncate">{model.name}</h3>
                <button onClick={handleCopy} className="shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100">
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-white/45" />}
                </button>
              </div>
              <p className="text-xs text-white/45">by {model.author}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {model.isNew && <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-white text-black rounded-full">New</span>}
            {model.isFree && <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-white/10 text-white/75 rounded-full">Free</span>}
          </div>
        </div>
        <p className="text-xs text-white/45 mt-3 line-clamp-2 leading-relaxed">{model.description}</p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {model.categories.slice(0, 3).map((tag) => (
            <span key={tag} className="px-2 py-0.5 text-[10px] font-mono text-white/60 bg-white/[0.07] rounded-md">{tag}</span>
          ))}
        </div>
      </div>
      <div className="px-4 py-3 border-t border-white/10 bg-black/35">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[10px] text-white/35 mb-0.5">Context</div>
            <div className="font-mono text-xs">
              {model.contextLength === 0 ? "—" : model.contextLength >= 1000000 ? `${model.contextLength / 1000000}M` : `${model.contextLength / 1000}K`}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-white/35 mb-0.5">Input</div>
            <div className="font-mono text-xs">{model.inputPrice}</div>
          </div>
          <div>
            <div className="text-[10px] text-white/35 mb-0.5">Output</div>
            <div className="font-mono text-xs">{model.outputPrice}</div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-white scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarFilters {
  modalities: string[];
  contextMin: number;
  priceMax: number;
  series: string[];
  categories: string[];
  params: string[];
  distillable: string; // "all" | "yes" | "no"
  providers: string[];
  authors: string[];
}

function Sidebar({
  filters,
  setFilters,
  showMobile,
  setShowMobile,
}: {
  filters: SidebarFilters;
  setFilters: React.Dispatch<React.SetStateAction<SidebarFilters>>;
  showMobile: boolean;
  setShowMobile: (v: boolean) => void;
}) {
  const toggle = <T extends string>(key: keyof SidebarFilters, val: T) => {
    setFilters((prev) => {
      const arr = prev[key] as T[];
      return {
        ...prev,
        [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val],
      };
    });
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-200",
          showMobile ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setShowMobile(false)}
      />

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed lg:relative top-0 left-0 h-full lg:h-full w-64 shrink-0 bg-transparent z-50 lg:z-auto border-r border-white/10 transition-transform duration-300 lg:transition-none lg:translate-x-0 flex flex-col",
          showMobile ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 lg:hidden">
          <span className="text-base font-semibold tracking-tight">Filters</span>
          <button onClick={() => setShowMobile(false)} className="p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable filter list */}
        <div className="h-full overflow-y-auto overscroll-contain px-4 py-2 space-y-0 scrollbar-none">

          {/* Input Modalities */}
          <FilterSection title="Input Modalities" icon={FileText}>
            {ALL_MODALITIES.map((m) => (
              <FilterItem key={m} label={m} checked={filters.modalities.includes(m)} onChange={() => toggle("modalities", m)} />
            ))}
          </FilterSection>

          {/* Context Length */}
          <FilterSection title="Context length" icon={Settings2}>
            <RangeSlider
              min={4000}
              max={1000000}
              value={filters.contextMin}
              onChange={(v) => setFilters((p) => ({ ...p, contextMin: v }))}
              formatMin="4K"
              formatMax="1M"
            />
          </FilterSection>

          {/* Prompt Pricing */}
          <FilterSection title="Prompt pricing" icon={Tag}>
            <RangeSlider
              min={0}
              max={20}
              value={filters.priceMax}
              onChange={(v) => setFilters((p) => ({ ...p, priceMax: v }))}
              formatMin="FREE"
              formatMax="$10+"
            />
            <div className="mt-2 text-xs font-mono text-white/45">
              Max: {filters.priceMax === 0 ? "Free" : `$${filters.priceMax.toFixed(2)}/M`}
            </div>
          </FilterSection>

          {/* Series */}
          <FilterSection title="Series" icon={Sparkles} defaultOpen={false}>
            {ALL_SERIES.slice(0, 4).map((s) => (
              <FilterItem key={s} label={s} checked={filters.series.includes(s)} onChange={() => toggle("series", s)} />
            ))}
            <details className="group/more">
              <summary className="text-xs text-white/45 hover:text-white cursor-pointer mt-1 list-none flex items-center gap-1">
                <span>More...</span>
              </summary>
              <div className="mt-1">
                {ALL_SERIES.slice(4).map((s) => (
                  <FilterItem key={s} label={s} checked={filters.series.includes(s)} onChange={() => toggle("series", s)} />
                ))}
              </div>
            </details>
          </FilterSection>

          {/* Categories */}
          <FilterSection title="Categories" icon={Tag} defaultOpen={false}>
            {ALL_CATEGORIES_FILTER.map((c) => (
              <FilterItem key={c} label={c} checked={filters.categories.includes(c)} onChange={() => toggle("categories", c)} />
            ))}
          </FilterSection>

          {/* Supported Parameters */}
          <FilterSection title="Supported Parameters" icon={Code2} defaultOpen={false}>
            {ALL_PARAMS.slice(0, 3).map((p) => (
              <FilterItem key={p} label={p} checked={filters.params.includes(p)} onChange={() => toggle("params", p)} />
            ))}
            <details>
              <summary className="text-xs text-white/45 hover:text-white cursor-pointer mt-1 list-none">More...</summary>
              <div className="mt-1">
                {ALL_PARAMS.slice(3).map((p) => (
                  <FilterItem key={p} label={p} checked={filters.params.includes(p)} onChange={() => toggle("params", p)} />
                ))}
              </div>
            </details>
          </FilterSection>

          {/* Distillable */}
          <FilterSection title="Distillable" icon={Scissors} defaultOpen={false}>
            {["yes", "no"].map((v) => (
              <label key={v} className="flex items-center gap-2.5 py-1 cursor-pointer group">
                <div
                  onClick={() => setFilters((p) => ({ ...p, distillable: p.distillable === v ? "all" : v }))}
                  className={cn(
                    "w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all duration-150 cursor-pointer",
                    filters.distillable === v ? "bg-white border-white" : "border-white/20 group-hover:border-white/45"
                  )}
                >
                  {filters.distillable === v && <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />}
                </div>
                <span className={cn("text-sm capitalize transition-colors", filters.distillable === v ? "text-white" : "text-white/50 group-hover:text-white")}>
                  {v}
                </span>
              </label>
            ))}
          </FilterSection>

          {/* Providers */}
          <FilterSection title="Providers" icon={Building2} defaultOpen={false}>
            {ALL_PROVIDERS.slice(0, 4).map((p) => (
              <FilterItem key={p} label={p} checked={filters.providers.includes(p)} onChange={() => toggle("providers", p)} />
            ))}
            <details>
              <summary className="text-xs text-white/45 hover:text-white cursor-pointer mt-1 list-none">More...</summary>
              <div className="mt-1">
                {ALL_PROVIDERS.slice(4).map((p) => (
                  <FilterItem key={p} label={p} checked={filters.providers.includes(p)} onChange={() => toggle("providers", p)} />
                ))}
              </div>
            </details>
          </FilterSection>

          {/* Model Authors */}
          <FilterSection title="Model Authors" icon={UserCircle} defaultOpen={false}>
            {ALL_AUTHORS.slice(0, 4).map((a) => (
              <FilterItem key={a} label={a} checked={filters.authors.includes(a)} onChange={() => toggle("authors", a)} />
            ))}
            <details>
              <summary className="text-xs text-white/45 hover:text-white cursor-pointer mt-1 list-none">More...</summary>
              <div className="mt-1">
                {ALL_AUTHORS.slice(4).map((a) => (
                  <FilterItem key={a} label={a} checked={filters.authors.includes(a)} onChange={() => toggle("authors", a)} />
                ))}
              </div>
            </details>
          </FilterSection>

          {/* Reset */}
          <div className="pt-4 pb-6">
            <button
              onClick={() =>
                setFilters({
                  modalities: [], contextMin: 4000, priceMax: 20,
                  series: [], categories: [], params: [],
                  distillable: "all", providers: [], authors: [],
                })
              }
              className="w-full py-2 text-xs text-white/60 hover:text-white border border-white/10 rounded-lg transition-colors hover:bg-white/10"
            >
              Reset all filters
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function ModelsContent() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showSort, setShowSort] = useState(false);
  const [showMobile, setShowMobile] = useState(false);

  const resetFilters = (): SidebarFilters => ({
    modalities: [],
    contextMin: 4000,
    priceMax: 20,
    series: [],
    categories: [],
    params: [],
    distillable: "all",
    providers: [],
    authors: [],
  });

  const [filters, setFilters] = useState<SidebarFilters>(resetFilters);

  const filtered = useMemo(() => {
    const result = models.filter((m) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !m.name.toLowerCase().includes(q) &&
          !m.provider.toLowerCase().includes(q) &&
          !m.description.toLowerCase().includes(q)
        ) return false;
      }
      if (category !== "all" && m.category !== category) return false;
      if (filters.modalities.length && !filters.modalities.some((mod) => m.modalities.includes(mod))) return false;
      if (m.contextLength > 0 && m.contextLength < filters.contextMin) return false;
      if (filters.priceMax < 20 && m.inputPriceRaw > filters.priceMax) return false;
      if (filters.series.length && !filters.series.some((s) => m.series.includes(s))) return false;
      if (filters.categories.length && !filters.categories.some((c) => m.categories.includes(c))) return false;
      if (filters.params.length && !filters.params.every((p) => m.supportedParams.includes(p))) return false;
      if (filters.distillable === "yes" && !m.distillable) return false;
      if (filters.distillable === "no" && m.distillable) return false;
      if (filters.providers.length && !filters.providers.includes(m.provider)) return false;
      if (filters.authors.length && !filters.authors.includes(m.author)) return false;
      return true;
    });

    result.sort((a, b) => {
      if (sort === "price-low") return a.inputPriceRaw - b.inputPriceRaw;
      if (sort === "context") return b.contextLength - a.contextLength;
      if (sort === "popular") {
        const scoreA = (a.isNew ? 3 : 0) + (a.isOpenSource ? 2 : 0) + (a.isFree ? 2 : 0) + a.contextLength / 100000;
        const scoreB = (b.isNew ? 3 : 0) + (b.isOpenSource ? 2 : 0) + (b.isFree ? 2 : 0) + b.contextLength / 100000;
        return scoreB - scoreA;
      }

      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return result;
  }, [search, category, filters, sort]);

  const activeFilterCount =
    filters.modalities.length + filters.series.length + filters.categories.length +
    filters.params.length + filters.providers.length + filters.authors.length +
    (filters.distillable !== "all" ? 1 : 0) +
    (filters.contextMin > 4000 ? 1 : 0) +
    (filters.priceMax < 20 ? 1 : 0);

  return (
    <div className="relative flex flex-1 min-h-0 overflow-hidden text-white">
      {/* ── Left Sidebar (desktop static + mobile overlay) ── */}
      <Sidebar filters={filters} setFilters={setFilters} showMobile={showMobile} setShowMobile={setShowMobile} />

      {/* ── Right Panel ───────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_6%,rgba(165,243,208,0.08)_0%,transparent_28%),radial-gradient(circle_at_22%_80%,rgba(255,158,141,0.07)_0%,transparent_30%)]" />

        {/* Top bar: search + controls */}
        <div className="relative shrink-0 border-b border-white/10 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile filter toggle */}
            <button
              className="lg:hidden flex items-center gap-1.5 px-3 py-2 text-sm border border-white/10 rounded-lg hover:bg-white/10 transition-colors shrink-0"
              onClick={() => setShowMobile(true)}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 text-[10px] bg-white text-black rounded-full flex items-center justify-center font-mono">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
              <input
                type="text"
                placeholder="Search models, providers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-4 bg-black/50 border border-white/10 rounded-lg text-sm placeholder:text-white/35 focus:outline-none focus:border-white/30 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-white/40 hover:text-white transition-colors" />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowSort(!showSort)}
                className="flex items-center gap-2 h-9 px-3 text-sm border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="hidden sm:inline text-white/60">{sortOptions.find((o) => o.id === sort)?.label}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-white/50 transition-transform", showSort && "rotate-180")} />
              </button>
              {showSort && (
                <div className="absolute top-full right-0 mt-1.5 w-44 bg-black/95 border border-white/10 rounded-lg shadow-xl z-20 overflow-hidden backdrop-blur">
                  {sortOptions.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => { setSort(o.id); setShowSort(false); }}
                      className={cn(
                        "w-full text-left px-3.5 py-2.5 text-sm transition-colors",
                        sort === o.id ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View toggle */}
            <div className="hidden sm:flex items-center border border-white/10 rounded-lg overflow-hidden shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-white text-black" : "text-white/60 hover:text-white")}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("p-2 transition-colors", viewMode === "list" ? "bg-white text-black" : "text-white/60 hover:text-white")}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-0.5 scrollbar-none">
            {categoryTabs.map((tab) => {
              const Icon = tab.icon;
              const count = tab.id === "all" ? models.length : models.filter((m) => m.category === tab.id).length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCategory(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0",
                    category === tab.id
                      ? "bg-white text-black"
                      : "bg-white/[0.06] text-white/60 hover:bg-white/[0.12] hover:text-white"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {tab.label}
                  <span className={cn("text-[10px] px-1 py-0.5 rounded-full", category === tab.id ? "bg-black/20 text-white" : "bg-white/10 text-white/70")}>
                    {count}
                  </span>
                </button>
              );
            })}

            <div className="ml-auto shrink-0 text-xs text-white/50 whitespace-nowrap pl-4">
              {filtered.length} model{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* ── Scrollable Model Grid ──────────────────── */}
        <div className="relative flex-1 overflow-y-auto overscroll-contain px-4 lg:px-6 py-5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-14 h-14 rounded-full bg-white/[0.06] flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-white/45" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight mb-2">No models found</h3>
              <p className="text-white/50 text-sm max-w-xs">Try adjusting your filters or search query.</p>
              <button
                onClick={() => { setSearch(""); setCategory("all"); setFilters(resetFilters()); }}
                className="mt-5 px-4 py-2 text-sm border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
              {filtered.map((model, i) => <ModelCard key={model.id} model={model} index={i} viewMode="grid" />)}
            </div>
          ) : (
            <div className="border-t border-white/10">
              {filtered.map((model, i) => <ModelCard key={model.id} model={model} index={i} viewMode="list" />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
