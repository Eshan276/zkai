"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const navLinks = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Models", href: "/model" },
  { name: "Ranking", href: "/provider_dashboard" },
  { name: "Docs", href: "https://github.com/Eshan276/zkai" },
] as const;

export function Navigation({ forceTransparent = false }: { forceTransparent?: boolean }) {
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
            <Button
              className={`rounded-full bg-white font-semibold text-black transition-all duration-500 hover:bg-white/90 ${
                isScrolled ? "h-10 px-5 text-sm" : "h-12 px-7 text-sm"
              }`}
            >
              Sign up
            </Button>
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
            <Button
              className="h-16 w-full rounded-full bg-white text-base font-semibold text-black hover:bg-white/90"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Sign up
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
