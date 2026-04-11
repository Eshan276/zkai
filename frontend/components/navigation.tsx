"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, LogOut, Menu, Wallet, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  clearWalletSession,
  connectWallet,
  hasPersistedWalletSession,
  persistWalletSession,
  refreshWalletState,
  waitForExtension,
  type ConnectedAPI,
  type MidnightWalletState,
} from "@/lib/wallet";

type NavWalletCallbacks = {
  onWalletChange?: (address: string | null) => void;
  onApiChange?: (api: ConnectedAPI | null) => void;
};

const navLinks = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Models", href: "/model" },
  { name: "Ranking", href: "/provider_dashboard" },
  { name: "Docs", href: "https://github.com/Eshan276/zkai" },
] as const;

function NavWalletButton({
  isScrolled,
  onClose,
  onWalletChange,
  onApiChange,
}: {
  isScrolled: boolean;
  onClose?: () => void;
} & NavWalletCallbacks) {
  const [walletState, setWalletState] = useState<MidnightWalletState | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [hasExtension, setHasExtension] = useState<boolean | null>(null);
  const apiRef = useRef<Awaited<ReturnType<typeof connectWallet>>["api"] | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoReconnectAttempted = useRef(false);
  const walletCallbacksRef = useRef({ onWalletChange, onApiChange });
  walletCallbacksRef.current = { onWalletChange, onApiChange };

  useEffect(() => {
    waitForExtension(3000).then((ext) => setHasExtension(!!ext));
  }, []);

  // Restore session after navigation or reload when user previously connected
  useEffect(() => {
    if (hasExtension !== true || walletState) return;
    if (!hasPersistedWalletSession()) return;
    if (autoReconnectAttempted.current) return;
    autoReconnectAttempted.current = true;

    let cancelled = false;
    (async () => {
      setConnecting(true);
      setError("");
      try {
        const { api, state } = await connectWallet();
        if (cancelled) return;
        apiRef.current = api;
        setWalletState(state);
        persistWalletSession();
        const { onWalletChange: ow, onApiChange: oa } = walletCallbacksRef.current;
        ow?.(state.address);
        oa?.(api as unknown as ConnectedAPI);
      } catch (e: unknown) {
        if (!cancelled) {
          clearWalletSession();
          setError(e instanceof Error ? e.message : "Could not restore wallet");
        }
      } finally {
        if (!cancelled) setConnecting(false);
      }
    })();

    return () => {
      cancelled = true;
      autoReconnectAttempted.current = false;
    };
  }, [hasExtension, walletState]);

  useEffect(() => {
    if (!walletState || !apiRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const fresh = await refreshWalletState(apiRef.current!);
        setWalletState(fresh);
      } catch {}
    }, 15_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [!!walletState]);

  async function connect() {
    setConnecting(true);
    setError("");
    try {
      const { api, state } = await connectWallet();
      apiRef.current = api;
      setWalletState(state);
      persistWalletSession();
      onWalletChange?.(state.address);
      onApiChange?.(api as unknown as ConnectedAPI);
      onClose?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConnecting(false);
    }
  }

  function disconnect() {
    if (pollRef.current) clearInterval(pollRef.current);
    apiRef.current = null;
    clearWalletSession();
    setWalletState(null);
    onWalletChange?.(null);
    onApiChange?.(null);
  }

  function copyAddress() {
    if (!walletState?.address) return;
    navigator.clipboard.writeText(walletState.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (walletState) {
    const short = `${walletState.address.slice(0, 8)}…${walletState.address.slice(-4)}`;
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={copyAddress}
          className={`flex items-center gap-2 rounded-full border border-white/20 bg-white/10 font-semibold text-white transition-all duration-500 hover:bg-white/20 ${
            isScrolled ? "h-10 px-4 text-sm" : "h-12 px-5 text-sm"
          }`}
        >
          <div className="h-2 w-2 rounded-full bg-green-400" />
          <span className="font-mono">{short}</span>
          {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 opacity-50" />}
        </button>
        <button
          onClick={disconnect}
          className="p-2 text-white/40 transition-colors hover:text-white/80"
          title="Disconnect"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (hasExtension === false) {
    return (
      <a
        href="https://chrome.google.com/webstore/search/midnight%20lace"
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 font-semibold text-yellow-300 transition-all duration-500 hover:bg-yellow-500/20 ${
          isScrolled ? "h-10 px-5 text-sm" : "h-12 px-7 text-sm"
        }`}
      >
        <AlertTriangle className="h-4 w-4" />
        Install Lace
      </a>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={connect}
        disabled={connecting || hasExtension === null}
        className={`rounded-full bg-white font-semibold text-black transition-all duration-500 hover:bg-white/90 disabled:opacity-50 ${
          isScrolled ? "h-10 px-5 text-sm" : "h-12 px-7 text-sm"
        }`}
      >
        <Wallet className="h-4 w-4" />
        {connecting ? "Connecting…" : "Connect Wallet"}
      </Button>
      {error && <div className="max-w-48 text-right text-xs text-red-400">{error}</div>}
    </div>
  );
}

export function Navigation({
  forceTransparent = false,
  onWalletChange,
  onApiChange,
}: { forceTransparent?: boolean } & NavWalletCallbacks) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const useGlassNav = !forceTransparent && (isScrolled || isMobileMenuOpen);

  return (
    <header
      className={`fixed left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? "top-4" : "top-0"
      }`}
    >
      <nav
        className={`mx-auto transition-all duration-500 ${
          useGlassNav
            ? "max-w-[1200px] rounded-2xl border border-white/10 bg-black/70 shadow-lg backdrop-blur-xl"
            : "max-w-[1400px] bg-transparent"
        }`}
      >
        <div
          className={`flex items-center justify-between px-6 transition-all duration-500 lg:px-8 ${
            isScrolled ? "h-14" : "h-20"
          }`}
        >
          <a href="#" className="flex items-center gap-2">
            <span
              className={`font-bold tracking-tight text-white transition-all duration-500 ${
                isScrolled ? "text-xl" : "text-2xl"
              }`}
            >
              ZKai
            </span>
            <span
              className={`font-mono text-white/45 transition-all duration-500 ${
                isScrolled ? "mt-0.5 text-[10px]" : "mt-1 text-xs"
              }`}
            >
              TM
            </span>
          </a>

          <div className="hidden items-center gap-10 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target={link.name === "Docs" ? "_blank" : undefined}
                rel={link.name === "Docs" ? "noreferrer" : undefined}
                className="group relative text-sm font-medium text-white/70 transition-colors duration-300 hover:text-white"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>

          <div className="hidden items-center md:flex">
            <NavWalletButton
              isScrolled={isScrolled}
              onWalletChange={onWalletChange}
              onApiChange={onApiChange}
            />
          </div>

          <button
            onClick={() => setIsMobileMenuOpen((value) => !value)}
            className="p-2 text-white md:hidden"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-40 bg-black transition-all duration-500 md:hidden ${
          isMobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex h-full flex-col px-8 pb-8 pt-28">
          <div className="flex flex-1 flex-col justify-center gap-8">
            {navLinks.map((link, i) => (
              <a
                key={link.name}
                href={link.href}
                target={link.name === "Docs" ? "_blank" : undefined}
                rel={link.name === "Docs" ? "noreferrer" : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-5xl font-semibold tracking-tight text-white transition-all duration-500 hover:text-white/70 ${
                  isMobileMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                }`}
                style={{ transitionDelay: isMobileMenuOpen ? `${i * 75}ms` : "0ms" }}
              >
                {link.name}
              </a>
            ))}
          </div>

          <div
            className={`border-t border-white/10 pt-8 transition-all duration-500 ${
              isMobileMenuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
            style={{ transitionDelay: isMobileMenuOpen ? "300ms" : "0ms" }}
          >
            <div className="w-full">
              <NavWalletButton
                isScrolled={false}
                onClose={() => setIsMobileMenuOpen(false)}
                onWalletChange={onWalletChange}
                onApiChange={onApiChange}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
